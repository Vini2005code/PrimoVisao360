"use client";

import type { LucideIcon } from "lucide-react";
import { Save } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type BaseFormModalMode = "create" | "edit";

export type BaseFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description?: string;
  mode?: BaseFormModalMode;
  children: ReactNode;
  onSubmitClick?: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitText?: string;
  cancelText?: string;
  submitButtonType?: "button" | "submit";
  disableSubmit?: boolean;
  disableCancel?: boolean;
  showCloseButton?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  formId?: string;
};

function getDefaultSubmitText(mode: BaseFormModalMode) {
  return mode === "edit" ? "Salvar alterações" : "Salvar";
}

export function BaseFormModal({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  mode = "create",
  children,
  onSubmitClick,
  onCancel,
  isSubmitting = false,
  submitText,
  cancelText = "Cancelar",
  submitButtonType = "submit",
  disableSubmit = false,
  disableCancel = false,
  showCloseButton = false,
  contentClassName = "sm:max-w-lg",
  bodyClassName,
  footerClassName,
  formId,
}: BaseFormModalProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    handleClose();
  };

  const resolvedSubmitText = submitText ?? getDefaultSubmitText(mode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={contentClassName}
        showCloseButton={!showCloseButton}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-left">
            <Icon className="text-muted-foreground" />
            {title}
          </DialogTitle>

          {description ? (
            <DialogDescription className="text-left">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className={bodyClassName ?? "space-y-4 py-4"}>{children}</div>

        <div
          className={
            footerClassName ?? "flex items-center justify-end gap-2 pt-4"
          }
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={disableCancel || isSubmitting}
          >
            {cancelText}
          </Button>

          <Button
            type={submitButtonType}
            form={formId}
            onClick={onSubmitClick}
            disabled={disableSubmit || isSubmitting}
            className="gap-2"
          >
            <Save />
            {resolvedSubmitText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
