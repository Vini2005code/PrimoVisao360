import { useQuery } from "@tanstack/react-query";
import { getPatientContacts } from "../services/getPatientContacts.service";

export function usePatientContacts(patientId: string) {
  return useQuery({
    queryKey: ["patientContacts", patientId],
    queryFn: () => getPatientContacts(patientId),
    enabled: !!patientId,
  });
}
