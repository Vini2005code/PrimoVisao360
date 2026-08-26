export type PatientAddressResponse = {
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  municipalityId?: string | null;
};

export type PatientSupplementaryDataResponse = {
  genderIdentity?: string | null;
  raceColor?: string | null;
  religion?: string | null;
  maritalStatus?: string | null;
  educationLevel?: string | null;
  birthCityMunicipalityId?: string | null;
  nationalityId?: string | null;
  occupationId?: string | null;
};

export type PatientAdditionalInfoResponse = {
  referralSource?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  xTwitter?: string | null;
};

export type PatientResponse = {
  id: string;
  clinicId?: string | null;
  medicalRecordNumber: number;
  fullName: string;
  socialName?: string | null;
  birthDate: string;
  sex: string;
  cpf?: string | null;
  motherName?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: PatientAddressResponse | null;
  supplementaryData?: PatientSupplementaryDataResponse | null;
  additionalInfo?: PatientAdditionalInfoResponse | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export type GetPatientsListParams = {
  page?: number;
  size?: number;
};
