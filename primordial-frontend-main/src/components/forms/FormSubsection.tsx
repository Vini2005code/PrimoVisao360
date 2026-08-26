import type { ReactNode } from "react";

interface FormSubsectionProps {
  title: string;
  children: ReactNode;
}

export function FormSubsection({ title, children }: FormSubsectionProps) {
  return (
    <div className="grid gap-4">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
