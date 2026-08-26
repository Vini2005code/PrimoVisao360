import { useMutation } from "@tanstack/react-query";
import { createPatient } from "../services/createPatient.service";
import type { CreatePatientRequest } from "../types/createPatient.types";

export function useCreatePatient() {
  return useMutation({
    mutationFn: (payload: CreatePatientRequest) => createPatient(payload),
  });
}
