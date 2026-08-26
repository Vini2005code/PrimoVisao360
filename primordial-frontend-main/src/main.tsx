import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/shared/providers/QueryProvider";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <TooltipProvider delayDuration={150}>
        <App />
      </TooltipProvider>
    </QueryProvider>
  </StrictMode>,
);
