import {
  fromE164BRToWhatsappInput,
  formatPhone,
} from "@/shared/utils/documents/phone";
import type { PatientFormValues } from "../form/patientForm.schema";

type PatientApiResponse = {
  fullName?: string | null;
  socialName?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  cpf?: string | null;
  motherName?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  address?: {
    postalCode?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    municipalityId?: string | number | null;
  } | null;
  supplementaryData?: {
    genderIdentity?: string | null;
    raceColor?: string | null;
    maritalStatus?: string | null;
    religion?: string | null;
    nationalityId?: string | number | null;
    birthCityMunicipalityId?: string | number | null;
    birthCityId?: string | number | null;
    educationLevel?: string | null;
    occupationId?: string | number | null;
  } | null;
  additionalInfo?: {
    referralSource?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    tiktok?: string | null;
    xTwitter?: string | null;
  } | null;
};

export function mapPatientToFormValues(
  patient: PatientApiResponse,
): PatientFormValues {
  return {
    fullName: patient.fullName ?? "",
    socialName: patient.socialName ?? "",
    birthDate: patient.birthDate ?? "",
    sex: patient.sex ?? "",
    cpf: patient.cpf ?? "",
    motherName: patient.motherName ?? "",

    whatsapp: fromE164BRToWhatsappInput(patient.whatsapp),
    phone: formatPhone(patient.phone),
    email: patient.email ?? "",

    address: {
      postalCode: patient.address?.postalCode ?? "",
      street: patient.address?.street ?? "",
      number: patient.address?.number ?? "",
      complement: patient.address?.complement ?? "",
      neighborhood: patient.address?.neighborhood ?? "",
      municipalityId: patient.address?.municipalityId?.toString() ?? "",
    },

    supplementaryData: {
      genderIdentity: patient.supplementaryData?.genderIdentity ?? "",
      raceColor: patient.supplementaryData?.raceColor ?? "",
      maritalStatus: patient.supplementaryData?.maritalStatus ?? "",
      religion: patient.supplementaryData?.religion ?? "",
      nationalityId: patient.supplementaryData?.nationalityId?.toString() ?? "",
      birthCityId:
        patient.supplementaryData?.birthCityMunicipalityId?.toString() ??
        patient.supplementaryData?.birthCityId?.toString() ??
        "",
      educationLevel: patient.supplementaryData?.educationLevel ?? "",
      occupationId: patient.supplementaryData?.occupationId?.toString() ?? "",
    },

    additionalInfo: {
      referralSource: patient.additionalInfo?.referralSource ?? "",
      instagram: patient.additionalInfo?.instagram ?? "",
      facebook: patient.additionalInfo?.facebook ?? "",
      linkedin: patient.additionalInfo?.linkedin ?? "",
      youtube: patient.additionalInfo?.youtube ?? "",
      tiktok: patient.additionalInfo?.tiktok ?? "",
      xTwitter: patient.additionalInfo?.xTwitter ?? "",
    },

    notes: patient.notes ?? "",

    healthInsurances: [],
    patientContacts: [],
  };
}
