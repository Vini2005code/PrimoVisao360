import { toast } from "sonner";
import type { FeedbackToastProps } from "./feedback.types";
import { FeedbackToast } from "./FeedbackToast";

export function showFeedback({
  title,
  text,
  variant = "info",
  icon,
}: FeedbackToastProps) {
  toast.custom(() => (
    <FeedbackToast title={title} text={text} variant={variant} icon={icon} />
  ));
}

export function showSuccessFeedback(title: string, text?: string) {
  showFeedback({
    title,
    text,
    variant: "success",
  });
}

export function showErrorFeedback(title: string, text?: string) {
  showFeedback({
    title,
    text,
    variant: "error",
  });
}

export function showWarningFeedback(title: string, text?: string) {
  showFeedback({
    title,
    text,
    variant: "warning",
  });
}

export function showDeleteFeedback(title: string, text?: string) {
  showFeedback({
    title,
    text,
    variant: "delete",
  });
}

export function showInfoFeedback(title: string, text?: string) {
  showFeedback({
    title,
    text,
    variant: "info",
  });
}
