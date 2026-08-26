export type CreatePatientHealthInsuranceRequest = {
  healthInsuranceOperatorId: number;
  cardNumber: string;
  validUntil?: string | null;
};

export type BulkCreatePatientHealthInsuranceRequest = {
  items: CreatePatientHealthInsuranceRequest[];
};
