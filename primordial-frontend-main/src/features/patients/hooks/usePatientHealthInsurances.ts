import { useQuery } from "@tanstack/react-query";
import { getPatientHealthInsurances } from "../services/getPatientHealthInsurances.service";

export function usePatientHealthInsurances(patientId?: string) {
  return useQuery({
    queryKey: ["patient-health-insurances", patientId],
    queryFn: () => getPatientHealthInsurances(patientId!),
    enabled: !!patientId,
  });
}
