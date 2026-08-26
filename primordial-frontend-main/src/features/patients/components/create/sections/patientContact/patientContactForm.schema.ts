import { z } from "zod";
import { hasInvalidCpfChars, isValidCpf } from "@/shared/utils/documents/cpf";

const isEmpty = (value?: string) => !value || value.trim() === "";

export const patientContactFormSchema = z
  .object({
    fullName: z.string().trim().min(3, "Informe o nome completo."),

    relationship: z.string().trim().min(1, "Informe o parentesco."),

    birthDate: z.string(),

    whatsapp: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => {
        if (!value) return true;
        return value.replace(/\D/g, "").length === 11;
      }, "WhatsApp inválido."),

    phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => {
        if (!value) return true;
        const digits = value.replace(/\D/g, "");
        return digits.length === 10 || digits.length === 11;
      }, "Telefone inválido."),

    email: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        "E-mail inválido.",
      ),

    cpf: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (value) => !value || !hasInvalidCpfChars(value),
        "Use apenas números no CPF.",
      )
      .refine((value) => !value || isValidCpf(value), "CPF inválido."),

    notes: z.string().trim().optional().or(z.literal("")),

    responsible: z.boolean(),
    emergencyContact: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (isEmpty(data.whatsapp) && isEmpty(data.phone)) {
      const message = "Informe ao menos um meio de contato.";

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsapp"],
        message,
      });

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message,
      });
    }

    if (!data.responsible && !data.emergencyContact) {
      const message = "Selecione ao menos uma função.";

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["responsible"],
        message,
      });

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emergencyContact"],
        message,
      });
    }
  });

export type PatientContactFormValues = z.infer<typeof patientContactFormSchema>;
