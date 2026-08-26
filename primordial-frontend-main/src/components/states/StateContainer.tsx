import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StateContainerProps = {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  tone?: "default" | "muted" | "destructive";
};

const sizeMap = {
  sm: "px-4 py-6",
  md: "px-6 py-10",
  lg: "px-8 py-14",
} as const;

const alignMap = {
  left: "items-start text-left",
  center: "items-center text-center",
} as const;

const toneMap = {
  default: "border border-border bg-background",
  muted: "border border-dashed border-border bg-muted/20",
  destructive: "border border-destructive/20 bg-destructive/5",
} as const;

export default function StateContainer({
  icon,
  title,
  description,
  action,
  className,
  contentClassName,
  size = "md",
  align = "center",
  tone = "muted",
}: StateContainerProps) {
  return (
    <div className={cn("rounded-xl", sizeMap[size], toneMap[tone], className)}>
      <div
        className={cn(
          "mx-auto flex max-w-md flex-col gap-2",
          alignMap[align],
          contentClassName,
        )}
      >
        {icon ? (
          <div className="text-muted-foreground [&_svg]:size-5">{icon}</div>
        ) : null}

        {title ? (
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        ) : null}

        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}

        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
