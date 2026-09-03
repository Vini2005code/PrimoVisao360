import { Route, Routes } from "react-router-dom";
import PrimordialDataPage from "@/features/patients/pages/PrimordialDataPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="*" element={<PrimordialDataPage />} />
    </Routes>
  );
}
