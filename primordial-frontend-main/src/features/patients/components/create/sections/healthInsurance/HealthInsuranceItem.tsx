"use client";

import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/shared/utils/formatters/date";

type HealthInsuranceItemProps = {
  operatorName?: string | null;
  cardNumber?: string | null;
  validUntil?: string | null;
  className?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
};

export function HealthInsuranceItem({
  operatorName,
  cardNumber,
  validUntil,
  className,
  showActions = false,
  onEdit,
  onRemove,
}: HealthInsuranceItemProps) {
  return (
    <div
      className={cn(
        "group rounded-md border border-border bg-transparent px-3 py-3 transition-colors hover:bg-muted/30 focus-within:bg-muted/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="mt-0.5 rounded-md bg-muted/40 p-2" aria-hidden="true">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Mobile: empilhado */}
            <div className="space-y-1 sm:hidden">
              <p className="wrap-break-words text-sm font-semibold text-foreground">
                {operatorName || "—"}
              </p>

              <p className="wrap-break-words text-sm text-muted-foreground">
                Nº{" "}
                <span className="font-medium text-foreground">
                  {cardNumber || "—"}
                </span>
              </p>

              <p className="wrap-break-words text-sm text-muted-foreground">
                Validade{" "}
                <span className="font-medium text-foreground">
                  {formatDate(validUntil)}
                </span>
              </p>
            </div>

            {/* Desktop/Tablet: horizontal */}
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm">
                <span className="font-semibold text-foreground">
                  {operatorName || "—"}
                </span>

                <span className="mx-4 text-muted-foreground">•</span>

                <span className="text-muted-foreground">
                  Nº{" "}
                  <span className="font-medium text-foreground">
                    {cardNumber || "—"}
                  </span>
                </span>

                <span className="mx-4 text-muted-foreground">•</span>

                <span className="text-muted-foreground">
                  Validade{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(validUntil)}
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>

        {showActions && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1",
              "sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8"
              aria-label={`Editar convênio ${operatorName ?? ""}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8"
              aria-label={`Remover convênio ${operatorName ?? ""}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
