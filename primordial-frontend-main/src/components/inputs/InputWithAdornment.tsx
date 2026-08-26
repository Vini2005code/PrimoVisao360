import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InputWithAdornmentProps = React.ComponentProps<typeof Input> & {
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  icon?: React.ElementType;
};

export function InputWithAdornment({
  startAdornment,
  endAdornment,
  icon: Icon,
  className,
  ...props
}: InputWithAdornmentProps) {
  const resolvedStart =
    startAdornment ??
    (Icon ? (
      <Icon className="size-4 text-muted-foreground pointer-events-none" />
    ) : null);

  return (
    <div className="relative">
      {resolvedStart ? (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {resolvedStart}
        </div>
      ) : null}

      {endAdornment ? (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          {endAdornment}
        </div>
      ) : null}

      <Input
        className={cn(
          resolvedStart && "pl-9",
          endAdornment && "pr-10",
          className,
        )}
        {...props}
      />
    </div>
  );
}
