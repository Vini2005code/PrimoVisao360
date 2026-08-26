export type PatientContactResponse = {
  id: string;
  patientId: string;
  fullName: string;
  cpf: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  relationship: string;
  responsible: boolean;
  emergencyContact: boolean;
  createdAt: string;
  updatedAt: string;
};
