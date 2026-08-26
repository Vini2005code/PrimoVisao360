import {
  User,
  Phone,
  MapPin,
  Info,
  Fingerprint,
  FileText,
  Share2,
  Shield,
  Users,
} from "lucide-react";
import { FormRow } from "@/components/forms/FormRow";
import { FormSection } from "@/components/sections/FormSection";
import { InlineEmptyState } from "@/components/states";
import { useHealthInsuranceOperator } from "@/shared/hooks/resources/useHealthInsuranceOperator";
import { useResourceById } from "@/shared/hooks/resources/useResourceById";
import { useMetadata } from "@/shared/hooks/useMetadata";
import { formatCep } from "@/shared/utils/documents/cep";
import { formatCpf } from "@/shared/utils/documents/cpf";
import { formatPhone } from "@/shared/utils/documents/phone";
import { formatDate, formatDateTime } from "@/shared/utils/formatters/date";
import { getMetadataLabel } from "@/shared/utils/labels/getMetadataLabel";
import { getOptionLabel } from "@/shared/utils/labels/getOptionLabel";
import { getResourceLabel } from "@/shared/utils/labels/getResourceLabel";
import type { PatientResponse } from "../../types/getPatientsList.types";
import type { PatientContactResponse } from "../../types/patientContact.types";
import type { PatientHealthInsuranceResponse } from "../../types/patientHealthInsurance.types";
import { HealthInsuranceItem } from "../create/sections/healthInsurance/HealthInsuranceItem";
import { PatientContactItem } from "../create/sections/patientContact/PatientContactItem";
import { ReadOnlyField } from "./ReadOnlyField";

interface PatientProfileTabProps {
  patient: PatientResponse;
  healthInsurances?: PatientHealthInsuranceResponse[];
  isLoadingHealthInsurances?: boolean;
  patientContacts?: PatientContactResponse[];
  isLoadingPatientContacts?: boolean;
}

export default function PatientProfileTab({
  patient,
  healthInsurances = [],
  isLoadingHealthInsurances = false,
  patientContacts = [],
  isLoadingPatientContacts = false,
}: PatientProfileTabProps) {
  const { data: sexOptions } = useMetadata("sex");
  const { data: maritalOptions } = useMetadata("maritalStatus");
  const { data: educationOptions } = useMetadata("educationLevel");
  const { data: raceOptions } = useMetadata("raceColor");
  const { data: religionOptions } = useMetadata("religion");
  const { data: referralOptions } = useMetadata("referralSource");
  const { data: genderOptions } = useMetadata("gender");
  const { data: relationshipOptions } = useMetadata("relationship");

  const { data: healthInsuranceOperators = [] } =
    useHealthInsuranceOperator("");

  const municipalityId = patient.address?.municipalityId
    ? Number(patient.address.municipalityId)
    : undefined;

  const nationalityId = patient.supplementaryData?.nationalityId
    ? Number(patient.supplementaryData.nationalityId)
    : undefined;

  const occupationId = patient.supplementaryData?.occupationId
    ? Number(patient.supplementaryData.occupationId)
    : undefined;

  const birthCityId = patient.supplementaryData?.birthCityMunicipalityId
    ? Number(patient.supplementaryData.birthCityMunicipalityId)
    : undefined;

  const { data: municipality } = useResourceById(
    "municipality",
    municipalityId,
  );

  const { data: nationality } = useResourceById("nationality", nationalityId);
  const { data: occupation } = useResourceById("occupation", occupationId);
  const { data: birthCity } = useResourceById("municipality", birthCityId);

  return (
    <div className="space-y-2">
      <FormSection icon={User} title="Dados pessoais">
        <FormRow columns={3}>
          <ReadOnlyField label="Nome completo" value={patient.fullName} />
          <ReadOnlyField label="Nome social" value={patient.socialName} />
          <ReadOnlyField label="CPF" value={formatCpf(patient.cpf)} />

          <ReadOnlyField
            label="Data de nascimento"
            value={formatDate(patient.birthDate)}
          />
          <ReadOnlyField
            label="Sexo"
            value={getMetadataLabel(sexOptions, patient.sex)}
          />
          <ReadOnlyField label="Nome da mãe" value={patient.motherName} />
        </FormRow>
      </FormSection>

      <FormSection icon={Phone} title="Contato">
        <FormRow columns={3}>
          <ReadOnlyField
            label="WhatsApp"
            value={formatPhone(patient.whatsapp)}
          />
          <ReadOnlyField
            label="Telefone/Celular"
            value={formatPhone(patient.phone)}
          />
          <ReadOnlyField label="E-mail" value={patient.email} />
        </FormRow>
      </FormSection>

      <FormSection icon={MapPin} title="Endereço">
        <FormRow columns={3}>
          <ReadOnlyField
            label="CEP"
            value={formatCep(patient.address?.postalCode)}
          />
          <ReadOnlyField label="Logradouro" value={patient.address?.street} />
          <ReadOnlyField label="Número" value={patient.address?.number} />

          <ReadOnlyField
            label="Complemento"
            value={patient.address?.complement}
          />
          <ReadOnlyField label="Bairro" value={patient.address?.neighborhood} />

          <ReadOnlyField
            label="Cidade"
            value={getResourceLabel("municipality", municipality)}
          />
        </FormRow>
      </FormSection>

      <FormSection icon={Users} title="Contatos">
        {isLoadingPatientContacts ? (
          <div className="text-sm text-muted-foreground">
            Carregando contatos...
          </div>
        ) : patientContacts.length === 0 ? (
          <InlineEmptyState message="Nenhum contato cadastrado." />
        ) : (
          <div className="space-y-2">
            {patientContacts.map((item) => (
              <PatientContactItem
                key={item.id}
                fullName={item.fullName ?? undefined}
                relationship={item.relationship ?? undefined}
                relationshipOptions={relationshipOptions ?? []}
                cpf={item.cpf ?? undefined}
                birthDate={item.birthDate ?? undefined}
                email={item.email ?? undefined}
                whatsapp={item.whatsapp ?? undefined}
                phone={item.phone ?? undefined}
                notes={item.notes ?? undefined}
                responsible={item.responsible}
                emergencyContact={item.emergencyContact}
              />
            ))}
          </div>
        )}
      </FormSection>

      <FormSection icon={Shield} title="Convênios">
        {isLoadingHealthInsurances ? (
          <div className="text-sm text-muted-foreground">
            Carregando convênios...
          </div>
        ) : healthInsurances.length === 0 ? (
          <InlineEmptyState message="Nenhum convênio cadastrado." />
        ) : (
          <div className="space-y-2">
            {healthInsurances.map((item) => (
              <HealthInsuranceItem
                key={item.id}
                operatorName={getOptionLabel(
                  healthInsuranceOperators,
                  item.healthInsuranceOperatorId,
                )}
                cardNumber={item.cardNumber}
                validUntil={item.validUntil}
              />
            ))}
          </div>
        )}
      </FormSection>

      <FormSection icon={Fingerprint} title="Dados complementares">
        <FormRow columns={3}>
          <ReadOnlyField
            label="Estado civil"
            value={getMetadataLabel(
              maritalOptions,
              patient.supplementaryData?.maritalStatus,
            )}
          />
          <ReadOnlyField
            label="Identidade de gênero"
            value={getMetadataLabel(
              genderOptions,
              patient.supplementaryData?.genderIdentity,
            )}
          />
          <ReadOnlyField
            label="Escolaridade"
            value={getMetadataLabel(
              educationOptions,
              patient.supplementaryData?.educationLevel,
            )}
          />

          <ReadOnlyField
            label="Nacionalidade"
            value={getResourceLabel("nationality", nationality)}
          />
          <ReadOnlyField
            label="Ocupação"
            value={getResourceLabel("occupation", occupation)}
          />
          <ReadOnlyField
            label="Raça/Cor"
            value={getMetadataLabel(
              raceOptions,
              patient.supplementaryData?.raceColor,
            )}
          />

          <ReadOnlyField
            label="Religião"
            value={getMetadataLabel(
              religionOptions,
              patient.supplementaryData?.religion,
            )}
          />
          <ReadOnlyField
            label="Cidade de nascimento"
            value={getResourceLabel("municipality", birthCity)}
          />
        </FormRow>
      </FormSection>

      <FormSection icon={Share2} title="Informações adicionais">
        <FormRow columns={3}>
          <ReadOnlyField
            label="Como nos conheceu"
            value={getMetadataLabel(
              referralOptions,
              patient.additionalInfo?.referralSource,
            )}
          />
          <ReadOnlyField
            label="Instagram"
            value={patient.additionalInfo?.instagram}
          />
          <ReadOnlyField
            label="Facebook"
            value={patient.additionalInfo?.facebook}
          />

          <ReadOnlyField
            label="LinkedIn"
            value={patient.additionalInfo?.linkedin}
          />
          <ReadOnlyField
            label="TikTok"
            value={patient.additionalInfo?.tiktok}
          />
          <ReadOnlyField
            label="X / Twitter"
            value={patient.additionalInfo?.xTwitter}
          />

          <ReadOnlyField
            label="YouTube"
            value={patient.additionalInfo?.youtube}
          />
        </FormRow>
      </FormSection>

      <FormSection icon={FileText} title="Observações">
        <div className="whitespace-pre-wrap text-sm text-foreground">
          {patient.notes || "—"}
        </div>
      </FormSection>

      <FormSection icon={Info} title="Registros do sistema">
        <FormRow columns={3}>
          <ReadOnlyField
            label="Número do prontuário"
            value={patient.medicalRecordNumber}
          />
          <ReadOnlyField
            label="Criado em"
            value={formatDateTime(patient.createdAt)}
          />
          <ReadOnlyField
            label="Atualizado em"
            value={formatDateTime(patient.updatedAt)}
          />
        </FormRow>
      </FormSection>
    </div>
  );
}
