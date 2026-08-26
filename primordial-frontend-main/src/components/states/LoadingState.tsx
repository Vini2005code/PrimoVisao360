import { Loader2 } from "lucide-react";
import StateContainer from "./StateContainer";

type LoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
};

export default function LoadingState({
  title = "Carregando",
  description = "Aguarde enquanto buscamos as informações.",
  className,
  size = "md",
  align = "center",
}: LoadingStateProps) {
  return (
    <StateContainer
      icon={<Loader2 className="animate-spin" />}
      title={title}
      description={description}
      className={className}
      size={size}
      align={align}
      tone="default"
    />
  );
}
