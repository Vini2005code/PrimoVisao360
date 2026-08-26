export function cepDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 8);
}

export function maskCep(value?: string | null) {
  const digits = cepDigits(value);

  if (digits.length <= 5) return digits;

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function hasInvalidCepChars(value?: string | null) {
  return /[^\d\-\s]/.test(value ?? "");
}

export function isValidCep(value?: string | null) {
  return cepDigits(value).length === 8;
}

export function formatCep(value?: string | null) {
  const cep = cepDigits(value);

  if (cep.length !== 8) return "—";

  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}
