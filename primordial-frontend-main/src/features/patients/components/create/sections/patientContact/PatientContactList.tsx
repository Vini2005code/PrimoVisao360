"use client";

import type { FieldArrayWithId } from "react-hook-form";
import { InlineEmptyState } from "@/components/states";
import type { PatientFormValues } from "@/features/patients/form/patientForm.schema";
import { useMetadata } from "@/shared/hooks/useMetadata";
import { PatientContactItem } from "./PatientContactItem";

export type PatientContactListItem = FieldArrayWithId<
  PatientFormValues,
  "patientContacts",
  "id"
>;

type PatientContactListProps = {
  items: PatientContactListItem[];
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  emptyText?: string;
};

export function PatientContactList({
  items,
  onEdit,
  onRemove,
  emptyText = "Nenhum contato cadastrado.",
}: PatientContactListProps) {
  const { data: relationshipOptions = [] } = useMetadata("relationship");

  if (items.length === 0) {
    return <InlineEmptyState message={emptyText} />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <PatientContactItem
          key={item.id}
          fullName={item.fullName ?? undefined}
          relationship={item.relationship ?? undefined}
          relationshipOptions={relationshipOptions}
          birthDate={item.birthDate ?? undefined}
          whatsapp={item.whatsapp ?? undefined}
          phone={item.phone ?? undefined}
          email={item.email ?? undefined}
          cpf={item.cpf ?? undefined}
          notes={item.notes ?? undefined}
          responsible={item.responsible}
          emergencyContact={item.emergencyContact}
          showActions
          onEdit={() => onEdit(item.id)}
          onRemove={() => onRemove(item.id)}
        />
      ))}
    </div>
  );
}
