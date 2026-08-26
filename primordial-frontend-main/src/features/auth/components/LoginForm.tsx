import { User } from "lucide-react";
import { useForm } from "react-hook-form";
import { PasswordField } from "@/components/fields/PasswordField";
import { TextField } from "@/components/fields/TextField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormProps = {
  onSubmit: (data: LoginFormValues) => void;
};

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = (data: LoginFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <TextField
          name="email"
          label="Usuário ou e-mail"
          placeholder="seu@email.com"
          autoComplete="username"
          variant="icon"
          icon={User}
        />

        <PasswordField name="password" label="Senha" placeholder="••••••••" />

        <Button
          type="submit"
          variant="accent"
          size="default"
          className="w-full"
        >
          Entrar
        </Button>
      </form>
    </Form>
  );
}
