import { z } from "zod";
import { healthInsuranceFormSchema } from "@/features/patients/components/create/sections/healthInsurance/healthInsuranceForm.schema";
import { patientContactFormSchema } from "@/features/patients/components/create/sections/patientContact/patientContactForm.schema";
import { hasInvalidCepChars, isValidCep } from "@/shared/utils/documents/cep";
import { cpfDigits, isValidCpf } from "@/shared/utils/documents/cpf";
import {
  isValidPhoneBR,
  isValidWhatsappBR,
} from "@/shared/utils/documents/phone";

const isEmpty = (v?: string) => !v || v.trim() === "";

export const patientFormSchema = z
  .object({
    fullName: z.string().min(3, "Informe o nome completo.").max(200),
    socialName: z.string().max(200).optional().or(z.literal("")),
    birthDate: z.string().min(1, "Informe a data de nascimento."),
    sex: z.string().min(1, "Informe o sexo."),

    cpf: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => {
        if (!v) return true;
        return cpfDigits(v).length === 11;
      }, "CPF inválido.")
      .refine((v) => {
        if (!v) return true;
        return isValidCpf(v);
      }, "CPF inválido."),

    motherName: z.string().max(200).optional().or(z.literal("")),

    whatsapp: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => {
        if (!v) return true;
        return isValidWhatsappBR(v);
      }, "WhatsApp inválido."),

    phone: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => {
        if (!v) return true;
        return isValidPhoneBR(v);
      }, "Telefone inválido."),

    email: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (v) => !v || z.string().email().safeParse(v).success,
        "E-mail inválido.",
      ),

    address: z.object({
      postalCode: z
        .string()
        .optional()
        .or(z.literal(""))
        .refine(
          (v) => !v || !hasInvalidCepChars(v),
          "Use apenas números no CEP.",
        )
        .refine((v) => !v || isValidCep(v), "CEP inválido."),
      street: z.string().optional().or(z.literal("")),
      number: z.string().optional().or(z.literal("")),
      complement: z.string().optional().or(z.literal("")),
      neighborhood: z.string().optional().or(z.literal("")),
      municipalityId: z.string().optional().or(z.literal("")),
    }),

    supplementaryData: z.object({
      genderIdentity: z.string().optional().or(z.literal("")),
      raceColor: z.string().optional().or(z.literal("")),
      maritalStatus: z.string().optional().or(z.literal("")),
      religion: z.string().optional().or(z.literal("")),
      nationalityId: z.string().optional().or(z.literal("")),
      birthCityId: z.string().optional().or(z.literal("")),
      educationLevel: z.string().optional().or(z.literal("")),
      occupationId: z.string().optional().or(z.literal("")),
    }),

    additionalInfo: z.object({
      referralSource: z.string().optional().or(z.literal("")),
      instagram: z.string().optional().or(z.literal("")),
      facebook: z.string().optional().or(z.literal("")),
      linkedin: z.string().optional().or(z.literal("")),
      youtube: z.string().optional().or(z.literal("")),
      tiktok: z.string().optional().or(z.literal("")),
      xTwitter: z.string().optional().or(z.literal("")),
    }),

    notes: z.string().optional().or(z.literal("")),

    healthInsurances: z.array(healthInsuranceFormSchema),
    patientContacts: z.array(patientContactFormSchema),
  })
  .superRefine((data, ctx) => {
    const whatsappEmpty = isEmpty(data.whatsapp);
    const phoneEmpty = isEmpty(data.phone);

    if (whatsappEmpty && phoneEmpty) {
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
  });

export type PatientFormValues = z.infer<typeof patientFormSchema>;
