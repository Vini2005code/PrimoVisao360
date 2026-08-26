import { calculateAge } from "@/shared/utils/formatters/age";
import type { PatientCardData } from "../components/list/PatientCard";
import type { PatientResponse } from "../types/getPatientsList.types";

export function mapPatientResponseToCard(
  patient: PatientResponse,
): PatientCardData {
  return {
    id: patient.id,
    fullName: patient.fullName,
    birthDate: patient.birthDate,
    age: patient.birthDate ? calculateAge(patient.birthDate) : undefined,
    sex: patient.sex,
    avatarUrl: null,
  };
}
