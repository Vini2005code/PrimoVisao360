import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  variant?: "default" | "secondary";
}

export default function ModuleCard({
  title,
  description,
  icon: Icon,
  to,
  variant = "default",
}: ModuleCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group block rounded-xl border border-border bg-card p-6",
        "shadow-card transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover",
        variant === "secondary" && "bg-muted/50",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
