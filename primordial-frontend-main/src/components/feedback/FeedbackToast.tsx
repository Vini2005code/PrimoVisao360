import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import type { FeedbackToastProps, FeedbackVariant } from "./feedback.types";

function getVariantIcon(variant: FeedbackVariant): ReactNode {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="size-5" />;
    case "warning":
      return <AlertTriangle className="size-5" />;
    case "error":
      return <XCircle className="size-5" />;
    case "delete":
      return <Trash2 className="size-5" />;
    case "info":
    default:
      return <Info className="size-5" />;
  }
}

function getVariantClasses(variant: FeedbackVariant) {
  switch (variant) {
    case "success":
      return {
        icon: "text-emerald-500",
        title: "text-foreground",
        text: "text-muted-foreground",
      };
    case "warning":
      return {
        icon: "text-amber-500",
        title: "text-foreground",
        text: "text-muted-foreground",
      };
    case "error":
      return {
        icon: "text-red-500",
        title: "text-foreground",
        text: "text-muted-foreground",
      };
    case "delete":
      return {
        icon: "text-red-500",
        title: "text-foreground",
        text: "text-muted-foreground",
      };
    case "info":
    default:
      return {
        icon: "text-sky-500",
        title: "text-foreground",
        text: "text-muted-foreground",
      };
  }
}

export function FeedbackToast({
  title,
  text,
  variant = "info",
  icon,
}: FeedbackToastProps) {
  const classes = getVariantClasses(variant);
  const resolvedIcon = icon ?? getVariantIcon(variant);

  return (
    <div className="flex min-w-90 max-w-105 items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-md">
      {" "}
      <div className={classes.icon}>{resolvedIcon}</div>
      <div className="grid gap-1">
        <p className={`text-sm font-semibold leading-none ${classes.title}`}>
          {title}
        </p>

        {text ? (
          <p className={`text-sm leading-snug ${classes.text}`}>{text}</p>
        ) : null}
      </div>
    </div>
  );
}
