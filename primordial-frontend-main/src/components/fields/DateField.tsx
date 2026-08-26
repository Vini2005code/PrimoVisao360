import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import * as React from "react";
import type { FieldValues, Path, RegisterOptions } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import { InputWithAdornment } from "@/components/inputs/InputWithAdornment";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  isoToDate,
  parseBRDateToISO,
  toIsoDateStringLocal,
} from "@/shared/utils/formatters/date";
import { maskBRDateInput } from "@/shared/utils/formatters/date";

type DateFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rules?: RegisterOptions<T, Path<T>>;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: (date: Date) => boolean;
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

type DateFieldInnerProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  placeholder: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: (date: Date) => boolean;
  onValueChange?: DateFieldProps<T>["onValueChange"];
  onValueBlur?: DateFieldProps<T>["onValueBlur"];
  helper?: React.ReactNode;
  field: {
    name: string;
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    ref: React.Ref<HTMLInputElement>;
  };
};

type IsDateDisabledParams = {
  value: Date | string;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: (date: Date) => boolean;
};

function isDateDisabled({
  value,
  minDate,
  maxDate,
  disabledDates,
}: IsDateDisabledParams) {
  const date = value instanceof Date ? value : isoToDate(value);

  if (!date) return true;
  if (minDate && date < minDate) return true;
  if (maxDate && date > maxDate) return true;
  if (disabledDates?.(date)) return true;

  return false;
}

function DateFieldInner<T extends FieldValues>(props: DateFieldInnerProps<T>) {
  const {
    name,
    label,
    placeholder,
    disabled,
    minDate,
    maxDate,
    disabledDates,
    onValueChange,
    onValueBlur,
    helper,
    field,
  } = props;

  const form = useFormContext<T>();
  const [open, setOpen] = React.useState(false);

  const isoValue = String(field.value ?? "");
  const selectedDate = isoToDate(isoValue);

  const displayValue = selectedDate ? format(selectedDate, "dd/MM/yyyy") : "";

  const [inputText, setInputText] = React.useState(displayValue);

  React.useEffect(() => {
    setInputText(displayValue);
  }, [displayValue]);

  const isDisabledDate = React.useCallback(
    (value: Date | string) =>
      isDateDisabled({
        value,
        minDate,
        maxDate,
        disabledDates,
      }),
    [minDate, maxDate, disabledDates],
  );

  const handleSelect = (date?: Date) => {
    if (!date || isDisabledDate(date)) return;

    const nextIso = toIsoDateStringLocal(date);
    field.onChange(nextIso);
    onValueChange?.(nextIso, { form });
    form.clearErrors(name);
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMasked = maskBRDateInput(e.target.value);
    setInputText(nextMasked);
    form.clearErrors(name);

    const maybeIso = parseBRDateToISO(nextMasked);

    if (maybeIso && !isDisabledDate(maybeIso)) {
      field.onChange(maybeIso);
      onValueChange?.(maybeIso, { form });
    }
  };

  const handleBlur = () => {
    field.onBlur();

    const trimmed = inputText.trim();

    if (!trimmed) {
      field.onChange("");
      form.clearErrors(name);
      onValueBlur?.("", { form });
      return;
    }

    const maybeIso = parseBRDateToISO(trimmed);

    if (!maybeIso) {
      form.setError(name, {
        type: "validate",
        message: "Data inválida. Use DD/MM/AAAA.",
      });
      onValueBlur?.(trimmed, { form });
      return;
    }

    if (isDisabledDate(maybeIso)) {
      form.setError(name, {
        type: "validate",
        message: "Data fora do intervalo permitido.",
      });
      onValueBlur?.(maybeIso, { form });
      return;
    }

    field.onChange(maybeIso);
    form.clearErrors(name);
    onValueBlur?.(maybeIso, { form });
  };

  const handleOpenCalendar = () => {
    if (disabled) return;
    setOpen(true);
  };

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>

      <FormControl>
        <Popover open={open} onOpenChange={setOpen}>
          <InputWithAdornment
            value={inputText}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            inputMode="numeric"
            autoComplete="bday"
            endAdornment={
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="inputIcon"
                  size="icon-sm"
                  onClick={handleOpenCalendar}
                  disabled={disabled}
                  aria-label="Abrir calendário"
                >
                  <CalendarDays className="size-4" />
                </Button>
              </PopoverTrigger>
            }
          />

          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              disabled={isDisabledDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </FormControl>

      {helper}
      <FormMessage />
    </FormItem>
  );
}

export function DateField<T extends FieldValues>(props: DateFieldProps<T>) {
  const {
    name,
    label,
    placeholder = "DD/MM/AAAA",
    disabled,
    className,
    minDate,
    maxDate,
    disabledDates,
    onValueChange,
    onValueBlur,
    helper,
  } = props;

  const { control } = useFormContext<T>();

  return (
    <div className={className}>
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <DateFieldInner<T>
            name={name}
            label={label}
            placeholder={placeholder}
            disabled={disabled}
            minDate={minDate}
            maxDate={maxDate}
            disabledDates={disabledDates}
            onValueChange={onValueChange}
            onValueBlur={onValueBlur}
            helper={helper}
            field={field}
          />
        )}
      />
    </div>
  );
}
