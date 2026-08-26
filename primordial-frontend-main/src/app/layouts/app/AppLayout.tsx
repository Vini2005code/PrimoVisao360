import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/app/layouts/shell/AppSidebar";
import { AppTopbar } from "@/app/layouts/shell/AppTopbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-h-svh flex flex-col">
        <AppTopbar />
        <main className="flex-1 pt-10 pb-8 px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
