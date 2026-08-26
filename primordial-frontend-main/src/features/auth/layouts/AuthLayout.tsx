import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="hidden lg:flex lg:w-1/2 items-center justify-center bg-brand-gradient">
        <div className="flex flex-col items-center text-center">
          <span className="text-primary-foreground text-8xl font-semibold leading-none">
            P
          </span>
          <h1 className="mt-2 text-4xl font-bold text-primary-foreground">
            Primordial
          </h1>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-background px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
