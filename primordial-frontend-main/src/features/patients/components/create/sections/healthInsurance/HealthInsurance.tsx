"use client";

import { Plus, Shield, Trash2 } from "lucide-react";
import * as React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ConfirmActionDialog } from "@/components/feedback/ConfirmActionDialog";
import { AccordionFormSection } from "@/components/sections/AccordionFormSection";
import { Button } from "@/components/ui/button";
import type { PatientFormValues } from "@/features/patients/form/patientForm.schema";
import type { HealthInsuranceFormValues } from "./healthInsuranceForm.schema";
import { HealthInsuranceList } from "./HealthInsuranceList";
import { HealthInsuranceModal } from "./HealthInsuranceModal";

export function HealthInsurance() {
  const { control } = useFormContext<PatientFormValues>();

  const { fields, append, update, remove } = useFieldArray<
    PatientFormValues,
    "healthInsurances"
  >({
    control,
    name: "healthInsurances",
  });

  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  const editingItem = React.useMemo(
    () => fields.find((item) => item.id === editingId) ?? null,
    [fields, editingId],
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setOpen(true);
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setOpen(true);
  };

  const handleCloseModal = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setEditingId(null);
    }
  };

  const handleSubmitHealthInsurance = (values: HealthInsuranceFormValues) => {
    const editingIndex = fields.findIndex((item) => item.id === editingId);

    if (editingIndex >= 0) {
      update(editingIndex, values);
      return;
    }

    append(values);
  };

  const handleRemoveHealthInsurance = (id: string) => {
    const removeIndex = fields.findIndex((item) => item.id === id);

    if (removeIndex >= 0) {
      remove(removeIndex);
    }

    if (editingId === id) {
      setEditingId(null);
    }

    setConfirmingId(null);
  };

  return (
    <AccordionFormSection
      value="health-insurances"
      icon={Shield}
      title="Convênios"
    >
      <div className="space-y-3">
        <HealthInsuranceList
          items={fields}
          onEdit={handleOpenEdit}
          onRemove={(id: string) => setConfirmingId(id)}
          emptyText="Nenhum convênio cadastrado."
        />

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={handleOpenCreate}
        >
          <Plus className="h-4 w-4" />
          Adicionar convênio
        </Button>
      </div>

      <HealthInsuranceModal
        open={open}
        onOpenChange={handleCloseModal}
        onSubmit={handleSubmitHealthInsurance}
        mode={editingId ? "edit" : "create"}
        initialValues={editingItem ?? undefined}
      />

      <ConfirmActionDialog
        open={!!confirmingId}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmingId(null);
        }}
        icon={Trash2}
        actionLabel="Remover"
        entityLabel="convênio"
        description="Esta ação não poderá ser desfeita."
        confirmText="Remover"
        cancelText="Cancelar"
        confirmVariant="destructive"
        onConfirm={() => {
          if (confirmingId) {
            handleRemoveHealthInsurance(confirmingId);
          }
        }}
      />
    </AccordionFormSection>
  );
}
