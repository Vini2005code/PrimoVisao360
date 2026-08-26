type AuthHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
