"use client";

import type { FieldArrayWithId } from "react-hook-form";
import { InlineEmptyState } from "@/components/states";
import type { PatientFormValues } from "@/features/patients/form/patientForm.schema";
import { HealthInsuranceItem } from "./HealthInsuranceItem";

export type HealthInsuranceListItem = FieldArrayWithId<
  PatientFormValues,
  "healthInsurances",
  "id"
>;

type HealthInsuranceListProps = {
  items: HealthInsuranceListItem[];
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  emptyText?: string;
};

export function HealthInsuranceList({
  items,
  onEdit,
  onRemove,
  emptyText = "Nenhum convênio cadastrado.",
}: HealthInsuranceListProps) {
  if (items.length === 0) {
    return <InlineEmptyState message={emptyText} />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <HealthInsuranceItem
          key={item.id}
          operatorName={item.operatorName}
          cardNumber={item.cardNumber}
          validUntil={item.validUntil}
          showActions
          onEdit={() => onEdit(item.id)}
          onRemove={() => onRemove(item.id)}
        />
      ))}
    </div>
  );
}
