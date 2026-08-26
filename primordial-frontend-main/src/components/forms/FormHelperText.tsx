type FormHelperTextProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormHelperText({ children, className }: FormHelperTextProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className ?? ""}`}>
      {children}
    </p>
  );
}
