import PatientVision360Tab from "../components/detail/PatientVision360Tab";

const LOCAL_PREVIEW_CLINIC_ID = "51dd9d7d-92a2-5af1-a5ef-adc5924b2864";
const LOCAL_PREVIEW_PATIENT_ID = "b43a334a-7d6a-5f80-ac74-26bbdb3ac676";

export default function PrimordialDataPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <PatientVision360Tab
          clinicId={LOCAL_PREVIEW_CLINIC_ID}
          patientId={LOCAL_PREVIEW_PATIENT_ID}
          patientName="Paciente do banco de teste"
        />
      </div>
    </main>
  );
}
