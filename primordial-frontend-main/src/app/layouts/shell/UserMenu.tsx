import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMenuProps = {
  name: string;
  subtitle?: string;
  initials: string;
  onLogout?: () => void;
};

export function UserMenu({ name, subtitle, initials }: UserMenuProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden max-w-65 min-w-0 flex-col items-end sm:flex">
        <span className="truncate text-sm font-medium text-foreground">
          {name}
        </span>

        {subtitle ? (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className=" cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Abrir menu do usuário"
          >
            <Avatar className="h-9 w-9 transition-all duration-200 hover:ring-2 hover:ring-primary hover:ring-offset-2">
              <AvatarFallback className="text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            onClick={() => navigate("/")}
            className="cursor-pointer"
          >
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
