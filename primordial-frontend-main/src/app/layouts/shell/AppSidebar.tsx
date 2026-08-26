import { Home, Users } from "lucide-react";
import * as React from "react";
import { NavLink } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Home", to: "/home", icon: Home },
  { label: "Pacientes", to: "/patients", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "bg-sidebar text-sidebar-foreground",
        "shadow-[8px_0_24px_rgba(0,0,0,0.30)]",
      )}
    >
      <SidebarHeader className="flex h-14 items-center justify-center px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* TODO: Replace placeholder with official brand logo */}
          <div className="h-8 w-8 shrink-0 rounded-md bg-sidebar-accent" />

          {!isCollapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-sidebar-foreground">
                Primordial
              </span>
              <span className="text-[10px] text-sidebar-muted-foreground">
                by Mitra
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-5">
        <SidebarMenu>
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.to}>
                <NavLink to={item.to} end>
                  {({ isActive }) => (
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <span className="flex h-11 items-center gap-3 rounded-lg px-3">
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium tracking-wide">
                          {item.label}
                        </span>
                      </span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
