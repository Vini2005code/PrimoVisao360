import { Toaster } from "sonner";
import PrimordialDataPage from "@/features/patients/pages/PrimordialDataPage";

export default function App() {
  return (
    <>
      <PrimordialDataPage />
      <Toaster position="top-center" closeButton duration={3500} />
    </>
  );
}
