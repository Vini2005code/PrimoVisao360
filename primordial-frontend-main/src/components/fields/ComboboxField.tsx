"use client";

import * as React from "react";
import { type FieldValues, type Path, useFormContext } from "react-hook-form";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { normalizeText } from "@/shared/utils/formatters/normalizeText";

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxFieldProps<TFormValues extends FieldValues> = {
  name: Path<TFormValues>;
  label: React.ReactNode;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  idleText?: string;
  minChars?: number;
  disabled?: boolean;
  className?: string;
  clearText?: string;
  loading?: boolean;
  remoteSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

function findSelectedOption(options: ComboboxOption[], value: string) {
  if (!value) return null;
  return options.find((option) => option.value === value) ?? null;
}

export function ComboboxField<TFormValues extends FieldValues>({
  name,
  label,
  options,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado.",
  idleText = "Digite para buscar...",
  minChars = 1,
  disabled = false,
  className,
  clearText = "Limpar seleção",
  loading = false,
  remoteSearch = false,
  searchValue,
  onSearchChange,
}: ComboboxFieldProps<TFormValues>) {
  const { control } = useFormContext<TFormValues>();
  const [internalQuery, setInternalQuery] = React.useState("");
  const [selectedOptionCache, setSelectedOptionCache] =
    React.useState<ComboboxOption | null>(null);

  const query = searchValue ?? internalQuery;

  const handleQueryChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
      return;
    }

    setInternalQuery(value);
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";

        const selectedOptionFromOptions = findSelectedOption(options, value);
        const selectedOption =
          selectedOptionFromOptions ??
          (selectedOptionCache?.value === value ? selectedOptionCache : null);

        const canClear = value !== "";
        const normalizedQuery = normalizeText(query);
        const canShowOptions = normalizedQuery.length >= minChars;

        const visibleOptions = remoteSearch
          ? canShowOptions
            ? options
            : []
          : canShowOptions
            ? options.filter((option) =>
                normalizeText(option.label).includes(normalizedQuery),
              )
            : [];

        const clearSelectionOption: ComboboxOption = {
          value: "",
          label: clearText,
        };

        const comboboxItems: ComboboxOption[] = [
          ...(canClear ? [clearSelectionOption] : []),
          ...visibleOptions,
        ];

        const showIdleState = !canShowOptions && !canClear;
        const showEmptyState =
          canShowOptions && !loading && visibleOptions.length === 0;

        const handleValueChange = (item: ComboboxOption | null) => {
          field.onChange(item?.value ?? "");

          if (item?.value) {
            setSelectedOptionCache(item);
          } else {
            setSelectedOptionCache(null);
          }

          handleQueryChange("");
        };

        return (
          <FormItem className={cn(className)}>
            <FormLabel>{label}</FormLabel>

            <FormControl>
              <Combobox
                items={comboboxItems}
                value={selectedOption}
                onValueChange={handleValueChange}
                disabled={disabled}
              >
                <ComboboxTrigger disabled={disabled}>
                  <ComboboxValue placeholder={placeholder} />
                </ComboboxTrigger>

                <ComboboxContent>
                  <ComboboxInput
                    showTrigger={false}
                    placeholder={searchPlaceholder}
                    disabled={disabled}
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                  />

                  {showIdleState && (
                    <div className="text-muted-foreground px-2 py-2 text-sm">
                      {idleText}
                    </div>
                  )}

                  {loading && canShowOptions && (
                    <div className="text-muted-foreground px-2 py-2 text-sm">
                      Carregando...
                    </div>
                  )}

                  {showEmptyState && <ComboboxEmpty>{emptyText}</ComboboxEmpty>}

                  <ComboboxList>
                    {(item) => (
                      <React.Fragment
                        key={item.value === "" ? "__clear__" : item.value}
                      >
                        <ComboboxItem value={item}>{item.label}</ComboboxItem>

                        {canClear && item.value === "" && (
                          <div className="bg-border -mx-1 my-1 h-px" />
                        )}
                      </React.Fragment>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </FormControl>

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
