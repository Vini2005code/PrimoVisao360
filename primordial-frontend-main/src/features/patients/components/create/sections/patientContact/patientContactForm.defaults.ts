import type { PatientContactFormValues } from "./patientContactForm.schema";

export const patientContactFormDefaultValues: PatientContactFormValues = {
  fullName: "",
  relationship: "",
  birthDate: "",
  whatsapp: "",
  phone: "",
  email: "",
  cpf: "",
  notes: "",
  responsible: false,
  emergencyContact: false,
};
