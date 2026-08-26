export type CreatePatientAddressRequest = {
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  municipalityId?: string | null;
};

export type CreatePatientSupplementaryDataRequest = {
  genderIdentity?: string | null;
  raceColor?: string | null;
  religion?: string | null;
  maritalStatus?: string | null;
  educationLevel?: string | null;
  birthCityId?: string | null;
  nationalityId?: string | null;
  occupationId?: string | null;
};

export type CreatePatientAdditionalInfoRequest = {
  referralSource?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  xTwitter?: string | null;
};

export type CreatePatientRequest = {
  fullName: string;
  socialName?: string | null;
  birthDate: string;
  sex: string;
  cpf?: string | null;
  motherName?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;

  address?: CreatePatientAddressRequest | null;
  supplementaryData?: CreatePatientSupplementaryDataRequest | null;
  additionalInfo?: CreatePatientAdditionalInfoRequest | null;

  notes?: string | null;
};
