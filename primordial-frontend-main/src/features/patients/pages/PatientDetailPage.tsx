import { Link, useParams } from "react-router-dom";
import PageHeader from "@/app/layouts/app/PageHeader";
import { PATHS } from "@/app/routes/paths";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PatientHeaderCard from "../components/detail/PatientHeaderCard";
import PatientProfileTab from "../components/detail/PatientProfileTab";
import PatientVision360Tab from "../components/detail/PatientVision360Tab";
import { usePatientById } from "../hooks/usePatientById";
import { usePatientContacts } from "../hooks/usePatientContacts";
import { usePatientHealthInsurances } from "../hooks/usePatientHealthInsurances";

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();

  const { data: patient, isLoading, isError } = usePatientById(patientId);

  const { data: healthInsurances = [], isLoading: isLoadingHealthInsurances } =
    usePatientHealthInsurances(patientId);

  const { data: patientContacts = [], isLoading: isLoadingPatientContacts } =
    usePatientContacts(patientId ?? "");

  const patientName = patient?.fullName ?? "Paciente";

  if (isLoading) {
    return <div className="p-6">Carregando paciente...</div>;
  }

  if (isError || !patient) {
    return <div className="p-6">Paciente não encontrado.</div>;
  }

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={PATHS.patients}>Pacientes</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{patientName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />

      <div className="space-y-6">
        <PatientHeaderCard
          fullName={patient.fullName}
          birthDate={patient.birthDate}
          sex={patient.sex}
          medicalRecordNumber={patient.medicalRecordNumber}
          patientId={patient.id}
        />

        <Tabs defaultValue="profile">
          <TabsList variant="line">
            <TabsTrigger value="profile">Cadastro</TabsTrigger>
            <TabsTrigger value="appointments">Atendimento</TabsTrigger>
            <TabsTrigger value="vision360">Visão 360</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <PatientProfileTab
              patient={patient}
              healthInsurances={healthInsurances}
              isLoadingHealthInsurances={isLoadingHealthInsurances}
              patientContacts={patientContacts}
              isLoadingPatientContacts={isLoadingPatientContacts}
            />
          </TabsContent>

          <TabsContent value="appointments" className="mt-6">
            <div className="rounded-lg border p-6">
              Histórico de atendimentos
            </div>
          </TabsContent>

          <TabsContent value="vision360" className="mt-6">
            <PatientVision360Tab
              patientId={patient.id}
              clinicId={patient.clinicId}
              patientName={patient.fullName}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
