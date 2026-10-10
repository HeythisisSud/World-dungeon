import { z } from 'zod'

export const CoordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const WaypointSchema = z.object({
  sequence: z.number().int().min(1).max(6),
  realPlaceName: z.string().min(3).max(100),
  coords: CoordsSchema,
  loreFragment: z.string().min(50).max(400),
  unlockCue: z.string().min(3).max(60),
})

export const QuestSchema = z.object({
  title: z.string().min(5).max(80),
  premise: z.string().min(20).max(300),
  tone: z.enum(['dark', 'mythic', 'eerie', 'folkloric']),
  waypoints: z.array(WaypointSchema).min(3).max(6),
  resolution: z.string().min(20).max(200),
  artifactName: z.string().min(3).max(80),
})

export const GenerateQuestRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(200).max(2000).default(1000),
  tone: z.enum(['dark', 'mythic', 'eerie', 'folkloric']).optional(),
})

export type Quest = z.infer<typeof QuestSchema>
export type Waypoint = z.infer<typeof WaypointSchema>
export type GenerateQuestRequest = z.infer<typeof GenerateQuestRequestSchema>
