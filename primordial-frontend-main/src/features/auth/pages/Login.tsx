import { useNavigate } from "react-router-dom";
import { PATHS } from "@/app/routes/paths";
import LoginForm from "@/features/auth/components/LoginForm";
import { AuthHeader } from "@/features/auth/layouts/AuthHeader";
import { AuthLayout } from "@/features/auth/layouts/AuthLayout";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function Login() {
  const navigate = useNavigate();

  const handleSubmit = (data: LoginFormValues) => {
    console.log("Login data:", data);
    navigate(PATHS.home);
  };

  return (
    <AuthLayout>
      <div className="lg:hidden text-center mb-8">
        <span className="text-6xl font-bold text-primary leading-none">P</span>
        <h1 className="mt-2 text-2xl font-bold text-primary">Primordial</h1>
      </div>

      <AuthHeader title="Login" subtitle="Acesse sua conta para continuar" />

      <LoginForm onSubmit={handleSubmit} />

      <p className="text-center text-muted-foreground text-xs mt-8">
        © 2026 Primordial. Todos os direitos reservados.
      </p>
    </AuthLayout>
  );
}
