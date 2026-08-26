import type { PatientFormValues } from "./patientForm.schema";

export const patientFormDefaultValues: PatientFormValues = {
  fullName: "",
  socialName: "",
  birthDate: "",
  sex: "",
  cpf: "",
  motherName: "",

  whatsapp: "",
  phone: "",
  email: "",

  address: {
    postalCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    municipalityId: "",
  },

  supplementaryData: {
    genderIdentity: "",
    raceColor: "",
    maritalStatus: "",
    religion: "",
    nationalityId: "",
    birthCityId: "",
    educationLevel: "",
    occupationId: "",
  },

  additionalInfo: {
    referralSource: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    youtube: "",
    tiktok: "",
    xTwitter: "",
  },

  notes: "",

  healthInsurances: [],
  patientContacts: [],
};
