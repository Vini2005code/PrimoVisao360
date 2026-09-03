import { Toaster } from "sonner";
import AppRoutes from "@/app/routes/AppRoutes";

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster position="top-center" closeButton duration={3500} />
    </>
  );
}
