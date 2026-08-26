import { MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FieldValues, Path } from "react-hook-form";

import { TextField } from "@/components/fields/TextField";
import { maskWhatsappBR } from "@/shared/utils/documents/phone";

type WhatsappFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  icon?: LucideIcon;
  variant?: "icon" | "plain";
};

export function WhatsappField<T extends FieldValues>({
  name,
  label = "WhatsApp",
  placeholder = "(00) 00000-0000",
  disabled,
  className,
  icon = MessageCircle,
  variant = "icon",
}: WhatsappFieldProps<T>) {
  const baseProps = {
    name,
    label,
    placeholder,
    inputMode: "tel" as const,
    autoComplete: "tel",
    transform: maskWhatsappBR,
    disabled,
    className,
  };

  if (variant === "plain") {
    return <TextField {...baseProps} variant="plain" />;
  }

  return <TextField {...baseProps} variant="icon" icon={icon} />;
}
