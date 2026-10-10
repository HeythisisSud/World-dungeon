import 'dotenv/config.js'
import { z } from 'zod'

const ConfigSchema = z.object({
  // Groq Cloud Inference (Production / Fast Cloud)
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('gemma2-9b-it'),

  // Local Ollama Inference (Offline / Self-Hosted)
  USE_LOCAL_OLLAMA: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('gemma2:2b'),

  PORT: z.coerce.number().default(3001),
  SERPAPI_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
})

// Fail hard on startup if config is invalid.
// Never let a misconfigured server silently serve bad data.
const parsed = ConfigSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid configuration:')
  console.error(parsed.error.format())
  process.exit(1)
}

export const config = parsed.data
export type Config = z.infer<typeof ConfigSchema>
