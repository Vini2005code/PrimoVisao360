"use client";

import { Plus, Trash2, Users } from "lucide-react";
import * as React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ConfirmActionDialog } from "@/components/feedback/ConfirmActionDialog";
import { AccordionFormSection } from "@/components/sections/AccordionFormSection";
import { Button } from "@/components/ui/button";
import type { PatientFormValues } from "@/features/patients/form/patientForm.schema";
import type { PatientContactFormValues } from "./patientContactForm.schema";
import { PatientContactList } from "./PatientContactList";
import { PatientContactModal } from "./PatientContactModal";

export function PatientContact() {
  const { control } = useFormContext<PatientFormValues>();

  const { fields, append, update, remove } = useFieldArray<
    PatientFormValues,
    "patientContacts"
  >({
    control,
    name: "patientContacts",
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

  const handleSubmitPatientContact = (values: PatientContactFormValues) => {
    const editingIndex = fields.findIndex((item) => item.id === editingId);

    if (editingIndex >= 0) {
      update(editingIndex, values);
      return;
    }

    append(values);
  };

  const handleRemovePatientContact = (id: string) => {
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
      value="patient-contacts"
      icon={Users}
      title="Contatos do paciente"
    >
      <div className="space-y-3">
        <PatientContactList
          items={fields}
          onEdit={handleOpenEdit}
          onRemove={(id: string) => setConfirmingId(id)}
          emptyText="Nenhum contato cadastrado."
        />

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={handleOpenCreate}
        >
          <Plus className="h-4 w-4" />
          Adicionar contato
        </Button>
      </div>

      <PatientContactModal
        open={open}
        onOpenChange={handleCloseModal}
        onSubmit={handleSubmitPatientContact}
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
        entityLabel="contato"
        description="Esta ação não poderá ser desfeita."
        confirmText="Remover"
        cancelText="Cancelar"
        confirmVariant="destructive"
        onConfirm={() => {
          if (confirmingId) {
            handleRemovePatientContact(confirmingId);
          }
        }}
      />
    </AccordionFormSection>
  );
}
