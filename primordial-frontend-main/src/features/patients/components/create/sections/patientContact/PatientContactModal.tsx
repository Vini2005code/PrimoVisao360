"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Users } from "lucide-react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { DateField } from "@/components/fields/DateField";
import { SelectField } from "@/components/fields/SelectField";
import { TextField } from "@/components/fields/TextField";
import { WhatsappField } from "@/components/fields/WhatsappField";
import { BaseFormModal } from "@/components/modal/BaseFormModal";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMetadata } from "@/shared/hooks/useMetadata";
import { patientContactFormDefaultValues } from "./patientContactForm.defaults";
import {
  patientContactFormSchema,
  type PatientContactFormValues,
} from "./patientContactForm.schema";

type PatientContactModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PatientContactFormValues) => void;
  mode?: "create" | "edit";
  initialValues?: Partial<PatientContactFormValues>;
};

const PATIENT_CONTACT_FORM_ID = "patient-contact-form";

export function PatientContactModal({
  open,
  onOpenChange,
  onSubmit,
  mode = "create",
  initialValues,
}: PatientContactModalProps) {
  const form = useForm<PatientContactFormValues>({
    defaultValues: patientContactFormDefaultValues,
    mode: "onSubmit",
    resolver: zodResolver(patientContactFormSchema),
  });

  const { data: relationshipOptions = [], isLoading } =
    useMetadata("relationship");

  React.useEffect(() => {
    if (!open) return;

    form.reset(
      initialValues
        ? { ...patientContactFormDefaultValues, ...initialValues }
        : patientContactFormDefaultValues,
    );
  }, [open, initialValues, form]);

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      form.reset(patientContactFormDefaultValues);
    }
  };

  const handleSubmitValues = (values: PatientContactFormValues) => {
    onSubmit(values);
    handleClose(false);
  };

  return (
    <FormProvider {...form}>
      <BaseFormModal
        open={open}
        onOpenChange={handleClose}
        icon={Users}
        title={mode === "edit" ? "Editar contato" : "Adicionar contato"}
        description="Preencha os dados do contato do paciente."
        mode={mode}
        submitButtonType="submit"
        formId={PATIENT_CONTACT_FORM_ID}
        contentClassName="sm:max-w-2xl"
      >
        <form
          id={PATIENT_CONTACT_FORM_ID}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit(handleSubmitValues)(e);
          }}
          className="space-y-4"
        >
          <TextField
            name="fullName"
            label="Nome completo"
            placeholder="Digite o nome"
            autoComplete="name"
            variant="plain"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              name="relationship"
              label="Parentesco"
              placeholder={isLoading ? "Carregando..." : "Selecione"}
              options={relationshipOptions}
              disabled={isLoading}
            />

            <DateField
              name="birthDate"
              label="Data de nascimento"
              placeholder="dd/mm/aaaa"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <WhatsappField
              name="whatsapp"
              label="WhatsApp"
              placeholder="(00) 00000-0000"
              variant="plain"
            />

            <TextField
              name="phone"
              label="Telefone"
              placeholder="(00) 00000-0000"
              inputMode="tel"
              autoComplete="off"
              variant="plain"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="email"
              label="E-mail"
              placeholder="exemplo@email.com"
              inputMode="email"
              autoComplete="off"
              variant="plain"
            />

            <TextField
              name="cpf"
              label="CPF"
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              variant="plain"
            />
          </div>

          <TextField
            name="notes"
            label="Observações"
            placeholder="Observações adicionais"
            variant="plain"
          />

          <div className="space-y-3">
            <FormField
              control={form.control}
              name="responsible"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                      />
                    </FormControl>

                    <div className="space-y-1">
                      <FormLabel className="text-sm font-normal">
                        Responsável legal
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyContact"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                      />
                    </FormControl>

                    <div className="space-y-1">
                      <FormLabel className="text-sm font-normal">
                        Contato de emergência
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </form>
      </BaseFormModal>
    </FormProvider>
  );
}
