/**
 * Retry wrapper with exponential backoff.
 * Used to handle transient Ollama generation failures.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
      }
    }
  }

  throw lastError
}
