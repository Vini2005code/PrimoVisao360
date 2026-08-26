export type CreatePatientContactRequest = {
  fullName: string;
  cpf?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  birthDate?: string | null;
  notes?: string;
  relationship: string;
  responsible: boolean;
  emergencyContact: boolean;
};

export type BulkCreatePatientContactRequest = {
  items: CreatePatientContactRequest[];
};
