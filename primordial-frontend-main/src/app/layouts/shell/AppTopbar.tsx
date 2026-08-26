import { UserMenu } from "@/app/layouts/shell/UserMenu";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-card">
      <div className="flex h-14 w-full items-center justify-between gap-2 px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="shrink-0" />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <UserMenu
            name="Fulano da Silva Ciclano"
            subtitle="Médico Cardiologista"
            initials="FC"
            onLogout={() => {
              console.log("logout");
            }}
          />
        </div>
      </div>
    </header>
  );
}
