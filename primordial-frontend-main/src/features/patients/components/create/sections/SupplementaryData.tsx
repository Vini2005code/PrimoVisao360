"use client";

import { Fingerprint } from "lucide-react";
import * as React from "react";
import { useWatch } from "react-hook-form";
import { ComboboxField } from "@/components/fields/ComboboxField";
import { SelectField } from "@/components/fields/SelectField";
import { FormRow } from "@/components/forms/FormRow";
import { FormSubsection } from "@/components/forms/FormSubsection";
import { AccordionFormSection } from "@/components/sections/AccordionFormSection";
import {
  useMunicipality,
  useNationality,
  useOccupation,
  useResourceById,
} from "@/shared/hooks/resources";
import { useMetadata } from "@/shared/hooks/useMetadata";
import type { ResourceOption } from "@/shared/services/resources/types";

function mergeSelectedOption(
  options: ResourceOption[],
  selected?: ResourceOption | null,
): ResourceOption[] {
  if (!selected) return options;

  const alreadyExists = options.some(
    (option) => option.value === selected.value,
  );

  if (alreadyExists) return options;

  return [selected, ...options];
}

export function SupplementaryData() {
  const [occupationQuery, setOccupationQuery] = React.useState("");
  const [nationalityQuery, setNationalityQuery] = React.useState("");
  const [municipalityQuery, setMunicipalityQuery] = React.useState("");

  const selectedNationalityId = useWatch({
    name: "supplementaryData.nationalityId",
  });

  const selectedBirthCityId = useWatch({
    name: "supplementaryData.birthCityId",
  });

  const selectedOccupationId = useWatch({
    name: "supplementaryData.occupationId",
  });

  const nationalityIdNumber = selectedNationalityId
    ? Number(selectedNationalityId)
    : undefined;

  const birthCityIdNumber = selectedBirthCityId
    ? Number(selectedBirthCityId)
    : undefined;

  const occupationIdNumber = selectedOccupationId
    ? Number(selectedOccupationId)
    : undefined;

  const { data: gender = [], isLoading: loadingGender } = useMetadata("gender");
  const { data: raceColor = [], isLoading: loadingRaceColor } =
    useMetadata("raceColor");
  const { data: maritalStatus = [], isLoading: loadingMaritalStatus } =
    useMetadata("maritalStatus");
  const { data: religion = [], isLoading: loadingReligion } =
    useMetadata("religion");
  const { data: educationLevel = [], isLoading: loadingEducationLevel } =
    useMetadata("educationLevel");

  const { data: occupation = [], isLoading: loadingOccupation } =
    useOccupation(occupationQuery);

  const { data: nationality = [], isLoading: loadingNationality } =
    useNationality(nationalityQuery);

  const { data: birthCity = [], isLoading: loadingBirthCity } =
    useMunicipality(municipalityQuery);

  const { data: selectedNationality } = useResourceById(
    "nationality",
    nationalityIdNumber,
  );

  const { data: selectedBirthCity } = useResourceById(
    "municipality",
    birthCityIdNumber,
  );

  const { data: selectedOccupation } = useResourceById(
    "occupation",
    occupationIdNumber,
  );

  const selectedNationalityOption = selectedNationality
    ? {
        value: String((selectedNationality as { id: number }).id),
        label: (selectedNationality as { name: string }).name,
      }
    : null;

  const selectedBirthCityOption = selectedBirthCity
    ? {
        value: String((selectedBirthCity as { id: number }).id),
        label: (selectedBirthCity as { name: string }).name,
      }
    : null;

  const selectedOccupationOption = selectedOccupation
    ? {
        value: String((selectedOccupation as { id: number }).id),
        label: (selectedOccupation as { code?: string; title: string }).code
          ? `${(selectedOccupation as { code: string; title: string }).code} - ${(selectedOccupation as { title: string }).title}`
          : (selectedOccupation as { title: string }).title,
      }
    : null;

  const nationalityOptions = mergeSelectedOption(
    nationality,
    selectedNationalityOption,
  );

  const birthCityOptions = mergeSelectedOption(
    birthCity,
    selectedBirthCityOption,
  );

  const occupationOptions = mergeSelectedOption(
    occupation,
    selectedOccupationOption,
  );

  return (
    <AccordionFormSection
      value="supplementaryData"
      icon={Fingerprint}
      title="Dados complementares"
    >
      <FormSubsection title="Identificação social">
        <FormRow gap={4}>
          <SelectField
            name="supplementaryData.genderIdentity"
            label="Gênero"
            options={gender}
            placeholder={loadingGender ? "Carregando..." : "Selecione"}
            disabled={loadingGender}
          />

          <SelectField
            name="supplementaryData.raceColor"
            label="Raça/Cor"
            options={raceColor}
            placeholder={loadingRaceColor ? "Carregando..." : "Selecione"}
            disabled={loadingRaceColor}
          />

          <SelectField
            name="supplementaryData.maritalStatus"
            label="Estado civil"
            options={maritalStatus}
            placeholder={loadingMaritalStatus ? "Carregando..." : "Selecione"}
            disabled={loadingMaritalStatus}
          />

          <SelectField
            name="supplementaryData.religion"
            label="Religião"
            options={religion}
            placeholder={loadingReligion ? "Carregando..." : "Selecione"}
            disabled={loadingReligion}
          />
        </FormRow>
      </FormSubsection>

      <FormSubsection title="Origem">
        <FormRow gap={4}>
          <ComboboxField
            name="supplementaryData.nationalityId"
            label="Nacionalidade"
            options={nationalityOptions}
            placeholder="Selecione"
            searchPlaceholder="Busque uma nacionalidade"
            emptyText="Nenhuma nacionalidade encontrada."
            idleText="Digite para buscar nacionalidade..."
            loading={loadingNationality}
            remoteSearch
            searchValue={nationalityQuery}
            onSearchChange={setNationalityQuery}
          />

          <ComboboxField
            name="supplementaryData.birthCityId"
            label="Cidade de nascimento"
            options={birthCityOptions}
            placeholder="Selecione"
            searchPlaceholder="Busque uma cidade"
            emptyText="Nenhuma cidade encontrada."
            idleText="Digite para buscar cidade..."
            loading={loadingBirthCity}
            remoteSearch
            searchValue={municipalityQuery}
            onSearchChange={setMunicipalityQuery}
          />
        </FormRow>
      </FormSubsection>

      <FormSubsection title="Educação e trabalho">
        <FormRow gap={4}>
          <SelectField
            name="supplementaryData.educationLevel"
            label="Escolaridade"
            options={educationLevel}
            placeholder={loadingEducationLevel ? "Carregando..." : "Selecione"}
            disabled={loadingEducationLevel}
          />

          <div className="hidden md:block" />
        </FormRow>

        <ComboboxField
          name="supplementaryData.occupationId"
          label="Profissão"
          options={occupationOptions}
          placeholder="Selecione"
          searchPlaceholder="Busque uma profissão"
          emptyText="Nenhuma profissão encontrada."
          idleText="Digite para buscar profissão..."
          loading={loadingOccupation}
          remoteSearch
          searchValue={occupationQuery}
          onSearchChange={setOccupationQuery}
        />
      </FormSubsection>
    </AccordionFormSection>
  );
}
