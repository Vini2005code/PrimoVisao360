"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Shield } from "lucide-react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { DateField } from "@/components/fields/DateField";
import { SelectField } from "@/components/fields/SelectField";
import { TextField } from "@/components/fields/TextField";
import { BaseFormModal } from "@/components/modal/BaseFormModal";
import { useHealthInsuranceOperator } from "@/shared/hooks/resources/useHealthInsuranceOperator";
import { healthInsuranceFormDefaultValues } from "./healthInsuranceForm.defaults";
import {
  healthInsuranceFormSchema,
  type HealthInsuranceFormValues,
} from "./healthInsuranceForm.schema";

type HealthInsuranceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: HealthInsuranceFormValues) => void;
  mode?: "create" | "edit";
  initialValues?: Partial<HealthInsuranceFormValues>;
};

const HEALTH_INSURANCE_FORM_ID = "health-insurance-form";

export function HealthInsuranceModal({
  open,
  onOpenChange,
  onSubmit,
  mode = "create",
  initialValues,
}: HealthInsuranceModalProps) {
  const form = useForm<HealthInsuranceFormValues>({
    defaultValues: healthInsuranceFormDefaultValues,
    mode: "onSubmit",
    resolver: zodResolver(healthInsuranceFormSchema),
  });

  const { data: providers = [], isLoading } = useHealthInsuranceOperator("");

  React.useEffect(() => {
    if (!open) return;

    form.reset(
      initialValues
        ? { ...healthInsuranceFormDefaultValues, ...initialValues }
        : healthInsuranceFormDefaultValues,
    );
  }, [open, initialValues, form]);

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      form.reset(healthInsuranceFormDefaultValues);
    }
  };

  const handleSubmitValues = (values: HealthInsuranceFormValues) => {
    const selectedProvider = providers.find(
      (provider) => provider.value === values.healthInsuranceOperatorId,
    );

    onSubmit({
      ...values,
      operatorName: selectedProvider?.label ?? values.operatorName ?? "",
    });

    handleClose(false);
  };

  return (
    <FormProvider {...form}>
      <BaseFormModal
        open={open}
        onOpenChange={handleClose}
        icon={Shield}
        title={mode === "edit" ? "Editar convênio" : "Adicionar convênio"}
        description="Preencha os dados do convênio do paciente."
        mode={mode}
        submitButtonType="submit"
        formId={HEALTH_INSURANCE_FORM_ID}
        contentClassName="sm:max-w-lg"
      >
        <form
          id={HEALTH_INSURANCE_FORM_ID}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit(handleSubmitValues)(e);
          }}
          className="space-y-4"
        >
          <SelectField
            name="healthInsuranceOperatorId"
            label="Operadora"
            placeholder={isLoading ? "Carregando..." : "Selecione a operadora"}
            options={providers}
            disabled={isLoading}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="cardNumber"
              label="Número da carteirinha"
              placeholder="Número"
              inputMode="numeric"
              autoComplete="off"
              variant="plain"
            />

            <DateField
              name="validUntil"
              label="Validade"
              placeholder="dd/mm/aaaa"
            />
          </div>
        </form>
      </BaseFormModal>
    </FormProvider>
  );
}
