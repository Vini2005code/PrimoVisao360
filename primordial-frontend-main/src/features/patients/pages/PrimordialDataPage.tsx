import PatientVision360Tab from "../components/detail/PatientVision360Tab";

const LOCAL_PREVIEW_CLINIC_ID = "550e8400-e29b-41d4-a716-446655440000";
const LOCAL_PREVIEW_PATIENT_ID = "550e8400-e29b-41d4-a716-446655440001";

export default function PrimordialDataPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <PatientVision360Tab
          clinicId={LOCAL_PREVIEW_CLINIC_ID}
          patientId={LOCAL_PREVIEW_PATIENT_ID}
          patientName="Paciente de demonstração"
        />
      </div>
    </main>
  );
}
