import type { LucideIcon } from "lucide-react";
import * as React from "react";
import type { FieldValues, Path, RegisterOptions } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import { InputWithAdornment } from "@/components/inputs/InputWithAdornment";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type BaseTextFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  rules?: RegisterOptions<T, Path<T>>;

  transform?: (value: string) => string;
  onValueChange?: (
    value: string,
    ctx: { form: ReturnType<typeof useFormContext<T>> },
  ) => void;
  onValueBlur?: (
    value: string,
    ctx: { form: ReturnType<typeof useFormContext<T>> },
  ) => void;

  helper?: React.ReactNode;
};

type TextFieldProps<T extends FieldValues> =
  | (BaseTextFieldProps<T> & {
      variant: "plain";
      icon?: never;
    })
  | (BaseTextFieldProps<T> & {
      variant?: "icon";
      icon: LucideIcon;
    });

export function TextField<T extends FieldValues>(props: TextFieldProps<T>) {
  const {
    name,
    label,
    placeholder,
    type = "text",
    inputMode,
    autoComplete,
    maxLength,
    disabled,
    className,
    transform,
    onValueChange,
    onValueBlur,
    helper,
  } = props;

  const form = useFormContext<T>();
  const { control } = form;

  return (
    <div className={className}>
      <FormField
        control={control}
        name={name}
        render={({ field }) => {
          const value = field.value ?? "";

          const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            const next = transform ? transform(raw) : raw;
            field.onChange(next);
            onValueChange?.(next, { form });
          };

          const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            field.onBlur();
            const current =
              (form.getValues(name) as unknown as string | undefined) ??
              e.target.value ??
              "";
            onValueBlur?.(String(current), { form });
          };

          const commonInputProps = {
            placeholder,
            type,
            inputMode,
            autoComplete,
            maxLength,
            disabled,
            value,
            onChange: handleChange,
            onBlur: handleBlur,
            name: field.name,
            ref: field.ref,
          } as const;

          const isPlain = props.variant === "plain";

          return (
            <FormItem>
              <FormLabel>{label}</FormLabel>

              <FormControl>
                {isPlain ? (
                  <Input {...commonInputProps} />
                ) : (
                  <InputWithAdornment
                    {...commonInputProps}
                    startAdornment={
                      <props.icon className="size-4 text-muted-foreground" />
                    }
                  />
                )}
              </FormControl>

              {helper}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
}
