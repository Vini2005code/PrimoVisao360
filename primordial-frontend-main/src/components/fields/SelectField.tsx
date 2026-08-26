import * as React from "react";
import type { FieldValues, Path, RegisterOptions } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = {
  value: string;
  label: string;
};

type SelectFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  rules?: RegisterOptions<T, Path<T>>;
  clearText?: string;
};

export function SelectField<T extends FieldValues>({
  name,
  label,
  options,
  placeholder = "Selecione",
  disabled,
  required,
  className,
  rules,
  clearText = "Limpar seleção",
}: SelectFieldProps<T>) {
  const { control, setValue } = useFormContext<T>();
  const [open, setOpen] = React.useState(false);

  const hasOptions = options.length > 0;
  const isDisabled = disabled || !hasOptions;
  const safePlaceholder = hasOptions ? placeholder : "Sem opções";

  return (
    <div className={className}>
      <FormField
        control={control}
        name={name}
        rules={rules}
        render={({ field }) => {
          const value = typeof field.value === "string" ? field.value : "";
          const canClear = !required && value !== "";

          const handleClear = () => {
            setValue(name, "" as T[Path<T>], {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
            setOpen(false);
          };

          return (
            <FormItem>
              <FormLabel>
                {label}
                {required && <span className="ml-1 text-destructive">*</span>}
              </FormLabel>

              <Select
                value={value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                open={open}
                onOpenChange={setOpen}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={safePlaceholder} />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  {canClear && (
                    <>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="hover:bg-secondary hover:text-secondary-foreground text-foreground w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm transition-colors"
                      >
                        {clearText}
                      </button>

                      <div className="bg-border -mx-1 my-1 h-px" />
                    </>
                  )}

                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
}
