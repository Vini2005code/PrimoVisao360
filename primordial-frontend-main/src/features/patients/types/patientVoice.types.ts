import { z } from "zod";

export const voiceStatusSchema = z
  .object({
    enabled: z.boolean(),
    available: z.boolean(),
    transport: z.literal("websocket"),
    stt_provider: z.literal("local"),
    tts_provider: z.literal("local"),
    raw_audio_external: z.literal(false),
    audio_persistence: z.literal(false),
  })
  .strict();

const latencySchema = z
  .object({
    stt: z.number().int().nonnegative(),
    query: z.number().int().nonnegative(),
    llm: z.number().int().nonnegative(),
    tts: z.number().int().nonnegative(),
  })
  .strict();

export const voiceServerMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("ready"),
      max_audio_bytes: z.number().int().positive(),
      max_seconds: z.number().int().positive(),
    })
    .strict(),
  z.object({ type: z.literal("listening") }).strict(),
  z.object({ type: z.literal("processing") }).strict(),
  z.object({ type: z.literal("cancelled") }).strict(),
  z
    .object({
      type: z.literal("result"),
      transcript: z.string().trim().min(1).max(4_000),
      answer: z.string().trim().min(1).max(1_500),
      latency_ms: latencySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("audio_start"),
      mime_type: z.literal("audio/wav"),
      bytes: z.number().int().nonnegative(),
    })
    .strict(),
  z.object({ type: z.literal("audio_end") }).strict(),
  z
    .object({
      type: z.literal("error"),
      code: z.string().trim().min(1).max(100),
    })
    .strict(),
]);

export type VoiceStatus = z.infer<typeof voiceStatusSchema>;
export type VoiceServerMessage = z.infer<typeof voiceServerMessageSchema>;
export type VoiceLatency = z.infer<typeof latencySchema>;

export type VoiceUiState =
  | "checking"
  | "unavailable"
  | "idle"
  | "requesting_permission"
  | "listening"
  | "processing"
  | "speaking"
  | "error";
