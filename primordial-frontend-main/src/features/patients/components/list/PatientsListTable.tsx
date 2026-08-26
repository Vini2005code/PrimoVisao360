import { Link } from "react-router-dom";
import PatientCard from "./PatientCard";
import type { PatientCardData } from "./PatientCard";

type PatientsListTableProps = {
  patients: PatientCardData[];
  totalCount?: number;
  getPatientHref?: (patient: PatientCardData) => string;
};

export default function PatientsListTable({
  patients,
  totalCount,
  getPatientHref = (p) => `/patients/${p.id}`,
}: PatientsListTableProps) {
  const count = totalCount ?? patients.length;

  return (
    <section>
      <div className="mb-4 text-sm text-muted-foreground">
        {count} pacientes encontrados
      </div>

      <div className="flex flex-col gap-2">
        {patients.map((patient) => (
          <Link key={patient.id} to={getPatientHref(patient)} className="block">
            <PatientCard patient={patient} />
          </Link>
        ))}
      </div>
    </section>
  );
}
