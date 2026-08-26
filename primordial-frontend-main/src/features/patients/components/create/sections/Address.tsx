"use client";

import { MapPin } from "lucide-react";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { ComboboxField } from "@/components/fields/ComboboxField";
import { TextField } from "@/components/fields/TextField";
import { FormSection } from "@/components/sections/FormSection";
import { useMunicipality } from "@/shared/hooks/resources";
import { useViaCepAutofill } from "@/shared/hooks/useViaCepAutofill";
import { cepDigits, maskCep } from "@/shared/utils/documents/cep";

export function Address() {
  const { clearErrors, setError } = useFormContext();
  const [municipalityQuery, setMunicipalityQuery] = React.useState("");

  const { data: municipalities = [], isLoading: loadingMunicipalities } =
    useMunicipality(municipalityQuery);

  const { isFetchingCep } = useViaCepAutofill({
    zipField: "address.postalCode",
    streetField: "address.street",
    neighborhoodField: "address.neighborhood",
    cityField: "address.municipalityId",
    stateField: "address.uf",
    onCityResolvedSearch: setMunicipalityQuery,
  });

  return (
    <FormSection
      icon={MapPin}
      title="Endereço"
      description="Informações de localização do paciente"
    >
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <TextField
            variant="plain"
            name="address.postalCode"
            label="CEP"
            placeholder="00000-000"
            inputMode="numeric"
            autoComplete="postal-code"
            transform={(value) => {
              clearErrors("address.postalCode");
              return maskCep(value);
            }}
            onValueBlur={(value) => {
              const digits = cepDigits(String(value ?? ""));

              if (digits.length === 0) {
                clearErrors("address.postalCode");
                return;
              }

              if (digits.length < 8) {
                setError("address.postalCode", {
                  type: "manual",
                  message: "CEP incompleto",
                });
                return;
              }

              clearErrors("address.postalCode");
            }}
            helper={
              isFetchingCep ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Consultando CEP…
                </p>
              ) : null
            }
            className="md:col-span-2"
          />

          <TextField
            variant="plain"
            name="address.street"
            label="Logradouro"
            placeholder="Rua, Avenida, etc."
            autoComplete="street-address"
            disabled={isFetchingCep}
            className="md:col-span-6"
          />

          <TextField
            variant="plain"
            name="address.number"
            label="Número"
            placeholder="Ex: 123"
            inputMode="numeric"
            autoComplete="address-line2"
            className="md:col-span-2"
          />

          <TextField
            variant="plain"
            name="address.complement"
            label="Complemento"
            placeholder="Apto, bloco, etc."
            autoComplete="address-line2"
            className="md:col-span-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <TextField
            variant="plain"
            name="address.neighborhood"
            label="Bairro"
            placeholder="Digite o bairro"
            disabled={isFetchingCep}
            className="md:col-span-4"
          />

          <div className="md:col-span-8">
            <ComboboxField
              name="address.municipalityId"
              label="Cidade"
              options={municipalities}
              placeholder="Selecione"
              searchPlaceholder="Busque uma cidade"
              emptyText="Nenhuma cidade encontrada."
              idleText="Digite para buscar cidade..."
              loading={loadingMunicipalities}
              remoteSearch
              searchValue={municipalityQuery}
              onSearchChange={setMunicipalityQuery}
            />
          </div>
        </div>
      </div>
    </FormSection>
  );
}
