import { Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMetadata } from "@/shared/hooks/useMetadata";
import { formatFullAge } from "@/shared/utils/formatters/age";
import { formatDate } from "@/shared/utils/formatters/date";
import { getInitials } from "@/shared/utils/formatters/getInitials";
import { getMetadataLabel } from "@/shared/utils/labels/getMetadataLabel";

interface PatientHeaderCardProps {
  fullName: string;
  birthDate?: string;
  sex?: string;
  medicalRecordNumber?: number;
  patientId: string;
}

export default function PatientHeaderCard({
  fullName,
  birthDate,
  sex,
  medicalRecordNumber,
  patientId,
}: PatientHeaderCardProps) {
  const initials = getInitials(fullName);
  const birthLabel = formatDate(birthDate);
  const ageLabel = formatFullAge(birthDate);
  const { data: sexOptions } = useMetadata("sex");
  const sexLabel = getMetadataLabel(sexOptions, sex);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-base font-semibold sm:h-16 sm:w-16 sm:text-lg">
              {initials}
            </div>

            <div className="min-w-0 space-y-1">
              <h2 className="wrap-break-words text-lg font-semibold text-foreground sm:text-xl">
                {fullName}
              </h2>

              <p className="text-sm text-muted-foreground wrap-break-words">
                {birthLabel} • {ageLabel} • {sexLabel}
              </p>

              {medicalRecordNumber !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Prontuário: {medicalRecordNumber}
                </p>
              )}
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <Button variant="accent" asChild className="w-full sm:w-auto">
              <Link to={`/patients/${patientId}/edit`}>
                <Pencil />
                Editar paciente
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
