import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormRowProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  gap?: 4 | 6;
  className?: string;
}

const columnsMap = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
} as const;

const gapMap = {
  4: "gap-4",
  6: "gap-6",
} as const;

export function FormRow({
  children,
  columns = 2,
  gap = 6,
  className,
}: FormRowProps) {
  return (
    <div
      className={cn(
        "grid items-start",
        columnsMap[columns],
        gapMap[gap],
        className,
      )}
    >
      {children}
    </div>
  );
}
