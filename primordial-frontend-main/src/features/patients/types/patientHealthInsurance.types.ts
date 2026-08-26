export type PatientHealthInsuranceResponse = {
  id: string;
  patientId: string;
  healthInsuranceOperatorId: number;
  cardNumber: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
};
