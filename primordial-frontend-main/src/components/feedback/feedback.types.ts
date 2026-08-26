import type { ReactNode } from "react";

export type FeedbackVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "delete";

export type FeedbackToastProps = {
  title: string;
  text?: string;
  variant?: FeedbackVariant;
  icon?: ReactNode;
};
