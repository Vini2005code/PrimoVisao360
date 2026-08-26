import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  submitIcon?: ReactNode;
  isSubmitting?: boolean;
}

export function FormActions({
  onCancel,
  cancelLabel = "Cancelar",
  submitLabel = "Salvar",
  submitIcon,
  isSubmitting = false,
}: FormActionsProps) {
  return (
    <div className="flex justify-end gap-3 pt-4">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {submitIcon}
        {submitLabel}
      </Button>
    </div>
  );
}
