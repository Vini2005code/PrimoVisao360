import { cn } from "@/lib/utils";

type InlineEmptyStateProps = {
  message?: string;
  className?: string;
};

export default function InlineEmptyState({
  message = "Nenhum item cadastrado.",
  className,
}: InlineEmptyStateProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>{message}</p>
  );
}
