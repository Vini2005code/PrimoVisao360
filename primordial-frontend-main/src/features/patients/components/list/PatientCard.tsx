import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMetadata } from "@/shared/hooks/useMetadata";
import { formatFullAge } from "@/shared/utils/formatters/age";
import { formatDate } from "@/shared/utils/formatters/date";
import { getInitials } from "@/shared/utils/formatters/getInitials";
import { getMetadataLabel } from "@/shared/utils/labels/getMetadataLabel";

export type PatientCardData = {
  id: string;
  fullName: string;
  birthDate?: string;
  age?: number;
  sex?: string;
  avatarUrl?: string | null;
};

type PatientCardProps = {
  patient: PatientCardData;
  className?: string;
};

export default function PatientCard({ patient }: PatientCardProps) {
  const initials = getInitials(patient.fullName);
  const { data: sexOptions } = useMetadata("sex");
  const sexLabel = getMetadataLabel(sexOptions, patient.sex);

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 hover:border-primary">
      <Avatar className="h-10 w-10 border border-border">
        {patient.avatarUrl ? <AvatarImage src={patient.avatarUrl} /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-col">
        <h3 className="truncate font-medium">{patient.fullName}</h3>

        <p className="text-sm text-muted-foreground">
          {formatDate(patient.birthDate)} • {formatFullAge(patient.birthDate)} •{" "}
          {sexLabel}
        </p>
      </div>
    </div>
  );
}
