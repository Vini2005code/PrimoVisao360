"use client";

import type { LucideIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  entityLabel: string;
  description: string;
  icon?: LucideIcon;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
  size?: "default" | "sm";
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  actionLabel,
  entityLabel,
  description,
  icon: Icon,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmVariant = "destructive",
  size = "sm",
}: ConfirmActionDialogProps) {
  const title = `${actionLabel} ${entityLabel}`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          {Icon ? (
            <AlertDialogMedia>
              <Icon className="text-primary size-6" />
            </AlertDialogMedia>
          ) : null}

          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>

          <AlertDialogAction variant={confirmVariant} onClick={onConfirm}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
