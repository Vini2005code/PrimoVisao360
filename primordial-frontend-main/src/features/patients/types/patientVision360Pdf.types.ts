import { z } from "zod";
import { patientVision360SavedItemsSchema } from "./patientVision360.types";

export const patientVision360PdfRequestSchema = z
  .object({
    patientName: z.string().trim().min(1).max(200),
    generatedAt: z.string().datetime({ offset: true }),
    items: patientVision360SavedItemsSchema.min(1),
  })
  .strict();

export type PatientVision360PdfRequest = z.infer<
  typeof patientVision360PdfRequestSchema
>;

export type PatientVision360PdfWorkerResponse =
  | { type: "success"; buffer: ArrayBuffer; filename: string }
  | { type: "error"; message: string };
