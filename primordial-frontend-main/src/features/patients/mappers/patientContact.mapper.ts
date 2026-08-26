import type { PatientContactFormValues } from "@/features/patients/components/create/sections/patientContact/patientContactForm.schema";
import type { CreatePatientContactRequest } from "../types/createPatientContact.types";

export function mapPatientContactFormToRequest(
  item: PatientContactFormValues,
): CreatePatientContactRequest {
  return {
    fullName: item.fullName,
    cpf: item.cpf || undefined,
    whatsapp: item.whatsapp || undefined,
    phone: item.phone || undefined,
    email: item.email || undefined,
    birthDate: item.birthDate || null,
    relationship: item.relationship,
    responsible: item.responsible,
    emergencyContact: item.emergencyContact,
    notes: item.notes || "",
  };
}
