import type { MetadataOption } from "@/shared/services/metadata/types";

export function getMetadataLabel(
  options: MetadataOption[] | undefined,
  value?: string | null,
) {
  if (!value || !options) return "—";

  return options.find((opt) => opt.value === value)?.label ?? value;
}
