import { cn } from "@/lib/utils";

interface ReadOnlyFieldProps {
  label: string;
  value?: string | number | null;
  className?: string;
}

export function ReadOnlyField({ label, value, className }: ReadOnlyFieldProps) {
  const displayValue =
    value === null || value === undefined || value === "" ? "—" : value;

  return (
    <div className={cn("flex flex-col gap-1 min-w-0", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="text-sm font-medium text-foreground wrap-break-words whitespace-normal">
        {displayValue}
      </span>
    </div>
  );
}
