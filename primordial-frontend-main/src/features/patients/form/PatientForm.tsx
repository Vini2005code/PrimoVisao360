import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  showErrorFeedback,
  showSuccessFeedback,
} from "@/components/feedback/feedback";
import { FormActions } from "@/components/forms/FormActions";
import { Form } from "@/components/ui/form";
import {
  Address,
  Contact,
  PatientObservation,
  PersonalData,
  SupplementaryData,
  HealthInsurance,
  AdditionalInfo,
  PatientContact,
} from "@/features/patients/components/create/sections";
import { useBulkCreatePatientContacts } from "@/features/patients/hooks/useBulkCreatePatientContacts";
import { useBulkCreatePatientHealthInsurances } from "@/features/patients/hooks/useBulkCreatePatientHealthInsurances";
import { useCreatePatient } from "@/features/patients/hooks/useCreatePatient";
import type { CreatePatientRequest } from "@/features/patients/types/createPatient.types";
import type { BulkCreatePatientContactRequest } from "@/features/patients/types/createPatientContact.types";
import type { BulkCreatePatientHealthInsuranceRequest } from "@/features/patients/types/createPatientHealthInsurance.types";
import { cepDigits } from "@/shared/utils/documents/cep";
import { cpfDigits } from "@/shared/utils/documents/cpf";
import { phoneDigits, toE164BR } from "@/shared/utils/documents/phone";
import { useUpdatePatient } from "../hooks/useUpdatePatient";
import { patientFormDefaultValues } from "./patientForm.defaults";
import {
  patientFormSchema,
  type PatientFormValues,
} from "./patientForm.schema";

type PatientFormProps = {
  mode?: "create" | "edit";
  initialValues?: PatientFormValues;
  patientId?: string;
};

function buildPatientPayload(data: PatientFormValues): CreatePatientRequest {
  return {
    fullName: data.fullName,
    socialName: data.socialName || null,
    birthDate: data.birthDate,
    sex: data.sex,
    cpf: data.cpf?.trim() ? cpfDigits(data.cpf) : null,
    motherName: data.motherName || null,
    whatsapp: data.whatsapp?.trim() ? toE164BR(data.whatsapp) : null,
    phone: data.phone?.trim() ? phoneDigits(data.phone) : null,
    email: data.email || null,
    address: {
      ...data.address,
      postalCode: data.address.postalCode?.trim()
        ? cepDigits(data.address.postalCode)
        : null,
      street: data.address.street || null,
      number: data.address.number || null,
      complement: data.address.complement || null,
      neighborhood: data.address.neighborhood || null,
      municipalityId: data.address.municipalityId || null,
    },
    supplementaryData: {
      genderIdentity: data.supplementaryData.genderIdentity || null,
      raceColor: data.supplementaryData.raceColor || null,
      religion: data.supplementaryData.religion || null,
      maritalStatus: data.supplementaryData.maritalStatus || null,
      educationLevel: data.supplementaryData.educationLevel || null,
      birthCityId: data.supplementaryData.birthCityId || null,
      nationalityId: data.supplementaryData.nationalityId || null,
      occupationId: data.supplementaryData.occupationId || null,
    },
    additionalInfo: {
      referralSource: data.additionalInfo.referralSource || null,
      instagram: data.additionalInfo.instagram || null,
      facebook: data.additionalInfo.facebook || null,
      linkedin: data.additionalInfo.linkedin || null,
      youtube: data.additionalInfo.youtube || null,
      tiktok: data.additionalInfo.tiktok || null,
      xTwitter: data.additionalInfo.xTwitter || null,
    },
    notes: data.notes || null,
  };
}

function buildHealthInsurancePayload(
  items: PatientFormValues["healthInsurances"],
): BulkCreatePatientHealthInsuranceRequest {
  return {
    items: items.map((item) => ({
      healthInsuranceOperatorId: Number(item.healthInsuranceOperatorId),
      cardNumber: item.cardNumber.trim(),
      validUntil: item.validUntil.trim() ? item.validUntil : null,
    })),
  };
}

function buildPatientContactPayload(
  items: PatientFormValues["patientContacts"],
): BulkCreatePatientContactRequest {
  return {
    items: items.map((item) => ({
      fullName: item.fullName.trim(),
      cpf: item.cpf?.trim() ? cpfDigits(item.cpf) : undefined,
      whatsapp: item.whatsapp?.trim() ? phoneDigits(item.whatsapp) : undefined,
      phone: item.phone?.trim() ? phoneDigits(item.phone) : undefined,
      email: item.email?.trim() ? item.email.trim() : undefined,
      birthDate: item.birthDate?.trim() ? item.birthDate : null,
      notes: item.notes?.trim() ? item.notes.trim() : undefined,
      relationship: item.relationship.trim(),
      responsible: item.responsible,
      emergencyContact: item.emergencyContact,
    })),
  };
}

export function PatientForm({
  mode = "create",
  initialValues,
  patientId,
}: PatientFormProps) {
  const navigate = useNavigate();

  const {
    mutateAsync: createPatientMutateAsync,
    isPending: isCreatingPatient,
  } = useCreatePatient();

  const {
    mutateAsync: updatePatientMutateAsync,
    isPending: isUpdatingPatient,
  } = useUpdatePatient();

  const {
    mutateAsync: bulkCreateHealthInsurancesMutateAsync,
    isPending: isCreatingHealthInsurances,
  } = useBulkCreatePatientHealthInsurances();

  const {
    mutateAsync: bulkCreatePatientContactsMutateAsync,
    isPending: isCreatingPatientContacts,
  } = useBulkCreatePatientContacts();

  const form = useForm<PatientFormValues>({
    mode: "onSubmit",
    shouldUnregister: false,
    resolver: zodResolver(patientFormSchema),
    defaultValues: initialValues ?? patientFormDefaultValues,
  });

  async function onSubmit(data: PatientFormValues) {
    const patientPayload = buildPatientPayload(data);

    try {
      if (mode === "edit") {
        if (!patientId) {
          throw new Error("Patient ID is required for edit mode.");
        }

        await updatePatientMutateAsync({
          patientId,
          payload: patientPayload,
        });

        showSuccessFeedback(
          "Paciente atualizado com sucesso",
          "As alterações já estão disponíveis no cadastro do paciente.",
        );

        navigate(`/patients/${patientId}`);
        return;
      }

      const createdPatient = await createPatientMutateAsync(patientPayload);

      if (data.healthInsurances.length > 0) {
        const healthInsurancePayload = buildHealthInsurancePayload(
          data.healthInsurances,
        );

        await bulkCreateHealthInsurancesMutateAsync({
          patientId: createdPatient.id,
          payload: healthInsurancePayload,
        });
      }

      if (data.patientContacts.length > 0) {
        const patientContactPayload = buildPatientContactPayload(
          data.patientContacts,
        );

        await bulkCreatePatientContactsMutateAsync({
          patientId: createdPatient.id,
          payload: patientContactPayload,
        });
      }

      showSuccessFeedback(
        "Paciente criado com sucesso",
        "O paciente já está disponível na lista de pacientes.",
      );

      navigate("/patients");
    } catch (error) {
      console.error(
        mode === "edit" ? "Error updating patient:" : "Error creating patient:",
        error,
      );

      showErrorFeedback(
        mode === "edit"
          ? "Não foi possível atualizar o paciente"
          : "Não foi possível criar o paciente",
        "Revise os dados informados e tente novamente.",
      );
    }
  }

  const isPending =
    isCreatingPatient ||
    isUpdatingPatient ||
    isCreatingHealthInsurances ||
    isCreatingPatientContacts;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <PersonalData />
        <Contact />
        <Address />

        {mode === "create" && (
          <>
            <PatientContact />
            <HealthInsurance />
          </>
        )}

        <SupplementaryData />
        <AdditionalInfo />
        <PatientObservation />

        <FormActions
          onCancel={() =>
            navigate(
              mode === "edit" && patientId
                ? `/patients/${patientId}`
                : "/patients",
            )
          }
          submitLabel={
            isPending
              ? mode === "edit"
                ? "Salvando..."
                : "Salvando..."
              : mode === "edit"
                ? "Salvar alterações"
                : "Salvar"
          }
          submitIcon={<Save className="size-4" />}
        />
      </form>
    </Form>
  );
}
