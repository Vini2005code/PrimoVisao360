import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: PageHeaderProps) {
  const hasMainHeader = Boolean(title || actions);

  return (
    <div className={cn("space-y-2", hasMainHeader ? "mb-8" : "mb-4")}>
      {breadcrumb && <div>{breadcrumb}</div>}

      {hasMainHeader && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-2xl font-semibold text-foreground">
                {title}
              </h1>
            )}

            {description && (
              <p className="mt-1 text-muted-foreground">{description}</p>
            )}
          </div>

          {actions && <div className="flex items-center">{actions}</div>}
        </div>
      )}
    </div>
  );
}
