type OptionLike = {
  value: string | number;
  label: string;
};

export function getOptionLabel<T extends OptionLike>(
  options: T[] | undefined,
  value?: string | number | null,
) {
  if (value === null || value === undefined || value === "" || !options) {
    return "—";
  }

  return (
    options.find((opt) => String(opt.value) === String(value))?.label ??
    String(value)
  );
}
