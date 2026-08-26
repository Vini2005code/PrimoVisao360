import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface FormSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <header className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>

        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </header>

      <div className="mt-6">{children}</div>
    </section>
  );
}
