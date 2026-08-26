import { Eye, EyeOff, Lock } from "lucide-react";
import * as React from "react";
import { InputWithAdornment } from "@/components/inputs/InputWithAdornment";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

type PasswordFieldProps = {
  name: string;
  label?: string;
  placeholder?: string;
};

export function PasswordField({
  name,
  label = "Senha",
  placeholder = "Digite sua senha",
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>

          <FormControl>
            <InputWithAdornment
              type={showPassword ? "text" : "password"}
              placeholder={placeholder}
              autoComplete="current-password"
              startAdornment={<Lock className="size-4 text-muted-foreground" />}
              endAdornment={
                <Button
                  type="button"
                  variant="inputIcon"
                  size="icon"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              }
              {...field}
            />
          </FormControl>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
