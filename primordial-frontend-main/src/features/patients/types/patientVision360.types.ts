import { z } from "zod";

export const patientVision360EntityIdSchema = z
  .union([
    z.string().trim().min(1).max(100),
    z.number().int().nonnegative(),
  ])
  .transform(String);

export const patientVision360PatientIdSchema = z.string().uuid();

export const patientVision360RequestContextSchema = z
  .object({
    clinicId: z.string().uuid(),
    requestId: z.string().uuid().optional(),
  })
  .strict();

const chartTypeSchema = z
  .enum(["bar", "line", "pie", "donut", "doughnut"])
  .transform((type) => (type === "donut" ? "doughnut" : type));

export const patientVision360ChartSchema = z
  .object({
    type: chartTypeSchema,
    title: z.string().trim().min(1).max(200),
    labels: z.array(z.string().trim().min(1).max(120)).min(1).max(1_000),
    values: z.array(z.number().finite()).min(1).max(1_000),
  })
  .strict()
  .superRefine((chart, context) => {
    if (chart.labels.length !== chart.values.length) {
      context.addIssue({
        code: "custom",
        message: "labels e values devem possuir o mesmo tamanho",
        path: ["values"],
      });
    }
  });

export const patientVision360MessageSchema = z
  .object({
    id: patientVision360EntityIdSchema,
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
    created_at: z.string().trim().min(1).max(40),
    chart_data: patientVision360ChartSchema.optional(),
  })
  .strict();

export const patientVision360ConversationSchema = z
  .object({
    conversation_id: patientVision360EntityIdSchema.optional(),
    messages: z.array(patientVision360MessageSchema).max(500),
    updated_at: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

export const patientVision360SendMessageRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(4_000),
  })
  .strict();

export const patientVision360SendMessageResponseSchema = z
  .object({
    conversation_id: patientVision360EntityIdSchema.optional(),
    assistant_message: patientVision360MessageSchema,
    cached: z.boolean().default(false),
    status_processamento: z.literal("sucesso"),
  })
  .strict()
  .superRefine((response, context) => {
    if (response.assistant_message.role !== "assistant") {
      context.addIssue({
        code: "custom",
        message: "assistant_message deve possuir role assistant",
        path: ["assistant_message", "role"],
      });
    }
  });

export const patientVision360SaveRequestSchema = z
  .object({
    source_message_id: patientVision360EntityIdSchema,
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(4_000).optional(),
    chart_data: patientVision360ChartSchema.optional(),
  })
  .strict()
  .refine((item) => Boolean(item.content || item.chart_data), {
    message: "O salvamento deve conter texto ou gráfico",
  });

export const patientVision360SavedItemSchema = z
  .object({
    id: patientVision360EntityIdSchema,
    source_message_id: patientVision360EntityIdSchema,
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(4_000).optional(),
    chart_data: patientVision360ChartSchema.optional(),
    created_at: z.string().trim().min(1).max(40),
  })
  .strict()
  .refine((item) => Boolean(item.content || item.chart_data), {
    message: "O salvamento deve conter texto ou gráfico",
  });

export const patientVision360SavedItemsSchema = z
  .array(patientVision360SavedItemSchema)
  .max(500);

export type PatientVision360RequestContext = z.infer<
  typeof patientVision360RequestContextSchema
>;
export type PatientVision360Chart = z.infer<
  typeof patientVision360ChartSchema
>;
export type PatientVision360Message = z.infer<
  typeof patientVision360MessageSchema
>;
export type PatientVision360Conversation = z.infer<
  typeof patientVision360ConversationSchema
>;
export type PatientVision360SendMessageResponse = z.infer<
  typeof patientVision360SendMessageResponseSchema
>;
export type PatientVision360SaveRequest = z.infer<
  typeof patientVision360SaveRequestSchema
>;
export type PatientVision360SavedItem = z.infer<
  typeof patientVision360SavedItemSchema
>;
