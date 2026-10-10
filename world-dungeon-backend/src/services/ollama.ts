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
 * Attaches raw Ollama response for debugging.
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
