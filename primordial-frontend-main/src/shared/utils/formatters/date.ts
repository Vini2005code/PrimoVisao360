import { format, isValid, parseISO } from "date-fns";

export function formatDate(value?: string | null): string {
  if (!value) return "—";

  const parsed = parseISO(value);

  if (!isValid(parsed)) return "—";

  return format(parsed, "dd/MM/yyyy");
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const parsed = parseISO(value);

  if (!isValid(parsed)) return "—";

  return format(parsed, "dd/MM/yyyy 'às' HH:mm");
}

export function toIsoDateStringLocal(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function isoToDate(iso?: string | null) {
  if (!iso) return undefined;

  const parsed = parseISO(iso);
  return isValid(parsed) ? parsed : undefined;
}

export function parseBRDateToISO(input?: string | null) {
  const digits = (input ?? "").replace(/\D/g, "");

  if (digits.length !== 8) return null;

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  const iso = `${year}-${month}-${day}`;
  const parsed = parseISO(iso);

  if (!isValid(parsed)) return null;

  const roundTrip = format(parsed, "yyyy-MM-dd");
  if (roundTrip !== iso) return null;

  return iso;
}

export function maskBRDateInput(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);

  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}/${mm}`;

  return `${dd}/${mm}/${yyyy}`;
}
