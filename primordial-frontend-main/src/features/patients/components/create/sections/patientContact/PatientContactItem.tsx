"use client";

import { Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MetadataOption } from "@/shared/services/metadata/types";
import { formatCpf } from "@/shared/utils/documents/cpf";
import { formatPhone } from "@/shared/utils/documents/phone";
import { formatDate } from "@/shared/utils/formatters/date";
import { getMetadataLabel } from "@/shared/utils/labels/getMetadataLabel";

type PatientContactItemProps = {
  fullName?: string;
  relationship?: string;
  relationshipOptions?: MetadataOption[];
  cpf?: string;
  birthDate?: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  notes?: string;
  responsible?: boolean;
  emergencyContact?: boolean;
  className?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
};

type InfoLineItem = {
  label: string;
  value?: string;
};

function normalizeValue(value?: string) {
  if (!value?.trim()) return "—";
  return value;
}

function renderDesktopInfoLine(items: InfoLineItem[]) {
  return (
    <p className="truncate text-sm">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <span className="mx-3 text-muted-foreground">•</span>}

          <span className="text-muted-foreground">
            {item.label}{" "}
            <span className="font-medium text-foreground">
              {normalizeValue(item.value)}
            </span>
          </span>
        </span>
      ))}
    </p>
  );
}

function renderMobileInfoStack(items: InfoLineItem[]) {
  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <p
          key={`${item.label}-${index}`}
          className="text-sm text-muted-foreground"
        >
          {item.label}{" "}
          <span className="font-medium text-foreground">
            {normalizeValue(item.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function PatientContactItem({
  fullName,
  relationship,
  relationshipOptions = [],
  cpf,
  birthDate,
  email,
  whatsapp,
  phone,
  notes,
  responsible = false,
  emergencyContact = false,
  className,
  showActions = false,
  onEdit,
  onRemove,
}: PatientContactItemProps) {
  const relationshipLabel = getMetadataLabel(relationshipOptions, relationship);

  const firstLineItems: InfoLineItem[] = [
    {
      label: "CPF",
      value: cpf ? formatCpf(cpf) : undefined,
    },
    {
      label: "Nascimento",
      value: birthDate ? formatDate(birthDate) : undefined,
    },
    {
      label: "E-mail",
      value: email,
    },
  ];

  const secondLineItems: InfoLineItem[] = [
    {
      label: "WhatsApp",
      value: whatsapp ? formatPhone(whatsapp) : undefined,
    },
    {
      label: "Telefone",
      value: phone ? formatPhone(phone) : undefined,
    },
  ];

  return (
    <div
      className={cn(
        "group rounded-md border border-border bg-transparent px-3 py-3 transition-colors hover:bg-muted/30 focus-within:bg-muted/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 rounded-md bg-muted/40 p-2" aria-hidden="true">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-semibold text-foreground">
                {normalizeValue(fullName)}
              </span>

              <span className="text-muted-foreground">•</span>

              <span className="text-sm font-medium text-foreground">
                {normalizeValue(relationshipLabel)}
              </span>
            </div>

            {(responsible || emergencyContact) && (
              <div className="flex flex-wrap items-center gap-2">
                {responsible && (
                  <Badge className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    Responsável
                  </Badge>
                )}

                {emergencyContact && (
                  <Badge className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                    Emergência
                  </Badge>
                )}
              </div>
            )}

            <div className="space-y-1">
              <div className="hidden sm:block">
                {renderDesktopInfoLine(firstLineItems)}
              </div>
              <div className="sm:hidden">
                {renderMobileInfoStack(firstLineItems)}
              </div>

              <div className="hidden sm:block">
                {renderDesktopInfoLine(secondLineItems)}
              </div>
              <div className="sm:hidden">
                {renderMobileInfoStack(secondLineItems)}
              </div>

              {notes?.trim() && (
                <>
                  <div className="hidden sm:block">
                    {renderDesktopInfoLine([
                      {
                        label: "Observações",
                        value: notes,
                      },
                    ])}
                  </div>

                  <div className="sm:hidden">
                    {renderMobileInfoStack([
                      {
                        label: "Observações",
                        value: notes,
                      },
                    ])}
                  </div>
                </>
              )}
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
              aria-label={`Editar contato ${fullName ?? ""}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8"
              aria-label={`Remover contato ${fullName ?? ""}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
