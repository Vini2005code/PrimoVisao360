import { Link, useParams } from "react-router-dom";
import PageHeader from "@/app/layouts/app/PageHeader";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PatientForm } from "../form/PatientForm";
import { usePatientById } from "../hooks/usePatientById";
import { mapPatientToFormValues } from "../mappers/mapPatientToFormValues";

export default function PatientEditPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { data: patient, isLoading, isError } = usePatientById(patientId);

  const patientName = patient?.fullName ?? "Paciente";

  if (isLoading) {
    return <div className="p-6">Carregando paciente...</div>;
  }

  if (isError || !patient || !patientId) {
    return <div className="p-6">Paciente não encontrado.</div>;
  }

  return (
    <>
      <PageHeader
        title="Editar paciente"
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/patients">Pacientes</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/patients/${patientId}`}>{patientName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>Editar paciente</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />

      <PatientForm
        mode="edit"
        patientId={patientId}
        initialValues={mapPatientToFormValues(patient)}
      />
    </>
  );
}
