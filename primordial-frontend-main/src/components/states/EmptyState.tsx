import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import StateContainer from "./StateContainer";

type EmptyStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
};

export default function EmptyState({
  title = "Nenhum item encontrado",
  description = "Ainda não há dados para exibir nesta seção.",
  action,
  icon = <Inbox />,
  className,
  size = "md",
  align = "center",
}: EmptyStateProps) {
  return (
    <StateContainer
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
      size={size}
      align={align}
      tone="muted"
    />
  );
}
