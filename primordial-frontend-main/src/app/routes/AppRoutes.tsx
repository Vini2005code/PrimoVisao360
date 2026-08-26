import { Routes, Route } from "react-router-dom";
import AppLayout from "@/app/layouts/app/AppLayout";
import Login from "@/features/auth/pages/Login";
import Home from "@/features/home/pages/Home";
import PatientCreatePage from "@/features/patients/pages/PatientCreatePage";
import PatientDetailPage from "@/features/patients/pages/PatientDetailPage";
import PatientEditPage from "@/features/patients/pages/PatientEditPage";
import PatientsListPage from "@/features/patients/pages/PatientsListPage";

import { PATHS } from "./paths";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.login} element={<Login />} />

      <Route element={<AppLayout />}>
        <Route path={PATHS.home} element={<Home />} />

        <Route path={PATHS.patients}>
          <Route index element={<PatientsListPage />} />
          <Route path="new" element={<PatientCreatePage />} />
          <Route path=":patientId" element={<PatientDetailPage />} />
          <Route path=":patientId/edit" element={<PatientEditPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
