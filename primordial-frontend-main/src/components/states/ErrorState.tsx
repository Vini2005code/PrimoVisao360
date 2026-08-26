import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import StateContainer from "./StateContainer";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  retryLabel?: string;
  onRetry?: () => void;
};

export default function ErrorState({
  title = "Erro ao carregar dados",
  description = "Ocorreu um problema ao buscar as informações.",
  action,
  icon = <AlertCircle />,
  className,
  size = "md",
  align = "center",
  retryLabel = "Tentar novamente",
  onRetry,
}: ErrorStateProps) {
  const resolvedAction =
    action ??
    (onRetry ? (
      <Button variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null);

  return (
    <StateContainer
      icon={icon}
      title={title}
      description={description}
      action={resolvedAction}
      className={className}
      size={size}
      align={align}
      tone="destructive"
    />
  );
}
