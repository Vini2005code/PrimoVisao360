import { useMutation } from "@tanstack/react-query";
import { bulkCreatePatientHealthInsurances } from "../services/bulkCreatePatientHealthInsurances.service";
import type { BulkCreatePatientHealthInsuranceRequest } from "../types/createPatientHealthInsurance.types";

type MutationParams = {
  patientId: string;
  payload: BulkCreatePatientHealthInsuranceRequest;
};

export function useBulkCreatePatientHealthInsurances() {
  return useMutation({
    mutationFn: ({ patientId, payload }: MutationParams) =>
      bulkCreatePatientHealthInsurances(patientId, payload),
  });
}
