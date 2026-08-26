import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { fetchAddressByCEP } from "@/shared/services/apis/viacep";
import { getMunicipalityOptions } from "@/shared/services/resources";
import type { ResourceOption } from "@/shared/services/resources/types";

type UseViaCepAutofillOptions = {
  zipField?: string;
  streetField?: string;
  neighborhoodField?: string;
  cityField?: string;
  stateField?: string;
  onCityResolvedSearch?: (query: string) => void;
};

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;

  if (typeof err === "object" && err !== null && "name" in err) {
    return (err as { name?: unknown }).name === "AbortError";
  }

  return false;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findMunicipalityMatch(
  options: ResourceOption[],
  cityName: string,
  uf: string,
) {
  const normalizedCity = normalizeText(cityName);
  const normalizedUf = normalizeText(uf);

  return options.find((option) => {
    const [optionCity = "", optionUf = ""] = option.label.split(" - ");

    return (
      normalizeText(optionCity) === normalizedCity &&
      normalizeText(optionUf) === normalizedUf
    );
  });
}

export function useViaCepAutofill(options: UseViaCepAutofillOptions = {}) {
  const {
    zipField = "address.postal_code",
    streetField = "address.street",
    neighborhoodField = "address.neighborhood",
    cityField = "address.city",
    stateField = "address.uf",
    onCityResolvedSearch,
  } = options;

  const { watch, setValue, setError, clearErrors } = useFormContext();
  const zip = watch(zipField);

  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const lastFetchedCepRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cepDigits = String(zip ?? "").replace(/\D/g, "");

    if (cepDigits.length < 8) {
      abortRef.current?.abort();
      abortRef.current = null;

      setIsFetchingCep(false);
      lastFetchedCepRef.current = "";

      clearErrors(zipField);

      setValue(streetField, "", { shouldValidate: true, shouldDirty: true });
      setValue(neighborhoodField, "", {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue(cityField, "", { shouldValidate: true, shouldDirty: true });
      setValue(stateField, "", { shouldValidate: true, shouldDirty: true });

      onCityResolvedSearch?.("");

      return;
    }

    if (cepDigits.length !== 8) return;
    if (lastFetchedCepRef.current === cepDigits) return;

    lastFetchedCepRef.current = cepDigits;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setIsFetchingCep(true);

      try {
        const data = await fetchAddressByCEP(cepDigits, controller.signal);

        if (data.erro) {
          setError(zipField, {
            type: "manual",
            message: "CEP não encontrado",
          });
          return;
        }

        clearErrors(zipField);

        setValue(streetField, data.logradouro ?? "", {
          shouldValidate: true,
          shouldDirty: true,
        });

        setValue(neighborhoodField, data.bairro ?? "", {
          shouldValidate: true,
          shouldDirty: true,
        });

        setValue(stateField, data.uf ?? "", {
          shouldValidate: true,
          shouldDirty: true,
        });

        const cityName = data.localidade ?? "";
        const uf = data.uf ?? "";

        if (!cityName || !uf) {
          setValue(cityField, "", {
            shouldValidate: true,
            shouldDirty: true,
          });
          onCityResolvedSearch?.("");
          return;
        }

        onCityResolvedSearch?.(cityName);

        const municipalityOptions = await getMunicipalityOptions(cityName);
        const municipalityMatch = findMunicipalityMatch(
          municipalityOptions,
          cityName,
          uf,
        );

        setValue(cityField, municipalityMatch?.value ?? "", {
          shouldValidate: true,
          shouldDirty: true,
        });
      } catch (err: unknown) {
        if (isAbortError(err)) return;

        console.error("ViaCEP error:", err);
        setError(zipField, {
          type: "manual",
          message: "Erro ao consultar CEP",
        });
      } finally {
        setIsFetchingCep(false);
      }
    })();
  }, [
    zip,
    zipField,
    streetField,
    neighborhoodField,
    cityField,
    stateField,
    setValue,
    setError,
    clearErrors,
    onCityResolvedSearch,
  ]);

  return { isFetchingCep };
}
