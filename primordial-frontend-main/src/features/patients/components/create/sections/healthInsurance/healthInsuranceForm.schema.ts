import { z } from "zod";

export const healthInsuranceFormSchema = z.object({
  healthInsuranceOperatorId: z.string().trim().min(1, "Informe a operadora"),

  operatorName: z.string(),

  cardNumber: z.string().trim().min(1, "Informe o número da carteirinha"),

  validUntil: z.string(),
});

export type HealthInsuranceFormValues = z.infer<
  typeof healthInsuranceFormSchema
>;
