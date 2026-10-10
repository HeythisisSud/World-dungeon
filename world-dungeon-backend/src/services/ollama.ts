import { config } from '../config.js'
import { sanitizeJSON } from '../utils/sanitize.js'
import { withRetry } from '../utils/retry.js'
import { QuestSchema, type Quest } from '../validators/questSchema.js'

type OllamaGenerateResponse = {
  model: string
  response: string
  done: boolean
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  eval_count?: number
}

/**
 * Custom typed error for quest generation failures.
 * Attaches raw LLM response for debugging.
 */
export class QuestGenerationError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string,
    public readonly attempt: number
  ) {
    super(message)
    this.name = 'QuestGenerationError'
  }
}

/**
 * Call Groq API (/openai/v1/chat/completions) with system prompt and JSON mode.
 */
export async function generateQuestFromGroq(
  prompt: string
): Promise<Quest> {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  let lastRaw = ''

  const attemptGroq = async (userPrompt: string): Promise<Quest> => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a master worldbuilder and dark fantasy quest creator. You MUST respond with ONLY valid, raw JSON adhering strictly to the requested schema. Do not include markdown codeblocks or any commentary.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.85,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Groq API error ${res.status}: ${errText || res.statusText}`)
    }

    const data = await res.json()
    lastRaw = data.choices?.[0]?.message?.content || ''

    const sanitized = sanitizeJSON(lastRaw)
    const parsed = JSON.parse(sanitized) as unknown
    return QuestSchema.parse(parsed)
  }

  try {
    return await attemptGroq(prompt)
  } catch (firstErr) {
    console.warn('⚠ Groq first attempt failed, retrying with stricter prompt...')
    console.warn((firstErr as Error).message)
  }

  const stricterPrompt =
    prompt +
    '\n\nREMINDER: Return ONLY the JSON object. Start your response with { and end with }. No other text.'

  try {
    return await attemptGroq(stricterPrompt)
  } catch (secondErr) {
    throw new QuestGenerationError(
      `Groq quest generation failed after 2 attempts: ${(secondErr as Error).message}`,
      lastRaw,
      2
    )
  }
}

/**
 * Call Ollama /api/generate and return a validated Quest.
 * Retries once with a stricter prompt suffix if validation fails.
 */
export async function generateQuestFromOllama(
  prompt: string
): Promise<Quest> {
  let lastRaw = ''

  const attemptGeneration = async (promptText: string): Promise<Quest> => {
    const res = await fetch(`${config.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.OLLAMA_MODEL,
        prompt: promptText,
        stream: false,
        options: {
          temperature: 0.85,
          top_p: 0.92,
          top_k: 40,
          repeat_penalty: 1.1,
          num_predict: 1200,
        },
      }),
      signal: AbortSignal.timeout(120000), // 2 min max
    })

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`)
    }

    const data = (await res.json()) as OllamaGenerateResponse
    lastRaw = data.response

    const sanitized = sanitizeJSON(lastRaw)
    const parsed = JSON.parse(sanitized) as unknown
    return QuestSchema.parse(parsed)
  }

  // First attempt
  try {
    return await attemptGeneration(prompt)
  } catch (firstErr) {
    console.warn('⚠  First generation attempt failed, retrying with stricter prompt...')
    console.warn((firstErr as Error).message)
  }

  // Second attempt — append strict reminder
  const stricterPrompt =
    prompt +
    '\n\nREMINDER: Return ONLY the JSON object. Start your response with { and end with }. No other text.'

  try {
    return await attemptGeneration(stricterPrompt)
  } catch (secondErr) {
    throw new QuestGenerationError(
      `Quest generation failed after 2 attempts: ${(secondErr as Error).message}`,
      lastRaw,
      2
    )
  }
}

/**
 * Master Quest generation function:
 * Routes to Groq (Cloud / Production) or Ollama (Local / Offline) based on USE_LOCAL_OLLAMA flag.
 */
export async function generateQuestFromLLM(
  prompt: string
): Promise<Quest> {
  const useLocal = config.USE_LOCAL_OLLAMA || !config.GROQ_API_KEY

  if (!useLocal && config.GROQ_API_KEY) {
    try {
      return await generateQuestFromGroq(prompt)
    } catch (groqErr) {
      console.warn(`Groq generation failed (${(groqErr as Error).message}), attempting local Ollama fallback...`)
      return await generateQuestFromOllama(prompt)
    }
  }

  return await generateQuestFromOllama(prompt)
}

/**
 * Check if Ollama is running and the configured model is available.
 */
export async function checkOllamaHealth(): Promise<{
  connected: boolean
  model: string
  url: string
}> {
  try {
    const res = await fetch(`${config.OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    })
    return {
      connected: res.ok,
      model: config.OLLAMA_MODEL,
      url: config.OLLAMA_URL,
    }
  } catch {
    return {
      connected: false,
      model: config.OLLAMA_MODEL,
      url: config.OLLAMA_URL,
    }
  }
}

/**
 * Check active LLM health (Groq or Ollama based on configuration)
 */
export async function checkLLMHealth(): Promise<{
  provider: 'groq' | 'ollama'
  connected: boolean
  model: string
  url: string
}> {
  const useLocal = config.USE_LOCAL_OLLAMA || !config.GROQ_API_KEY

  if (!useLocal && config.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${config.GROQ_API_KEY}` },
        signal: AbortSignal.timeout(3000),
      })
      return {
        provider: 'groq',
        connected: res.ok,
        model: config.GROQ_MODEL,
        url: 'https://api.groq.com',
      }
    } catch {
      return {
        provider: 'groq',
        connected: false,
        model: config.GROQ_MODEL,
        url: 'https://api.groq.com',
      }
    }
  }

  const ollama = await checkOllamaHealth()
  return {
    provider: 'ollama',
    ...ollama,
  }
}
