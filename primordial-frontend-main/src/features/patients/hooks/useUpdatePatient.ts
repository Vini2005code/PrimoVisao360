import { useMutation } from "@tanstack/react-query";
import { updatePatient } from "../services/updatePatient.service";
import type { CreatePatientRequest } from "../types/createPatient.types";

export function useUpdatePatient() {
  return useMutation({
    mutationFn: ({
      patientId,
      payload,
    }: {
      patientId: string;
      payload: CreatePatientRequest;
    }) => updatePatient(patientId, payload),
  });
}
