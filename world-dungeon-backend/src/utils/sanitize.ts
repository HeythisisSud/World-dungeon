/**
 * Sanitizes raw Ollama output to extract a clean JSON object.
 * Ollama sometimes wraps output in markdown fences or adds preamble text.
 */
export function sanitizeJSON(raw: string): string {
  // 1. Remove markdown code fences: ```json ... ``` or ``` ... ```
  let cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')

  // 2. Find the first { and last } — extract only what's between them
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start === -1 || end === -1) {
    throw new Error(
      `No JSON object found in Ollama response. Raw (first 300 chars): ${raw.slice(0, 300)}`
    )
  }

  cleaned = cleaned.slice(start, end + 1)

  // 3. Remove BOM or zero-width characters
  cleaned = cleaned.replace(/^\uFEFF/, '')
  cleaned = cleaned.replace(/\u200B/g, '')

  // 4. Fix common Ollama JSON mistakes: trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')

  return cleaned.trim()
}
