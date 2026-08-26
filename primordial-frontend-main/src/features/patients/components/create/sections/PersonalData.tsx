import { User, UserPen, IdCard } from "lucide-react";
import { DateField } from "@/components/fields/DateField";
import { SelectField } from "@/components/fields/SelectField";
import { TextField } from "@/components/fields/TextField";
import { FormRow } from "@/components/forms/FormRow";
import { FormSection } from "@/components/sections/FormSection";
import { useMetadata } from "@/shared/hooks/useMetadata";
import { maskCpf } from "@/shared/utils/documents/cpf";

export function PersonalData() {
  const { data: sexOptions = [], isLoading: loadingSex } = useMetadata("sex");

  return (
    <FormSection
      icon={User}
      title="Dados pessoais"
      description="Informações básicas de identificação do paciente"
    >
      <div className="grid gap-6">
        <TextField
          name="fullName"
          label="Nome completo"
          icon={UserPen}
          placeholder="Digite o nome completo"
          autoComplete="name"
        />

        <TextField
          name="socialName"
          label="Nome social"
          variant="plain"
          placeholder="Nome social"
          autoComplete="nickname"
        />

        <FormRow>
          <DateField
            name="birthDate"
            label="Data de nascimento"
            className="w-full"
            placeholder="dd/mm/aaaa"
          />

          <SelectField
            name="sex"
            label="Sexo"
            options={sexOptions}
            placeholder={loadingSex ? "Carregando..." : "Selecione"}
            disabled={loadingSex}
          />
        </FormRow>

        <FormRow>
          <TextField
            name="cpf"
            label="CPF"
            icon={IdCard}
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="off"
            transform={maskCpf}
          />

          <TextField
            name="motherName"
            label="Nome da mãe"
            variant="plain"
            placeholder="Digite o nome completo da mãe"
            autoComplete="name"
          />
        </FormRow>
      </div>
    </FormSection>
  );
}
