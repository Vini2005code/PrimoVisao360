function normalizePhoneBR(value?: string | null) {
  if (!value) return "";

  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}

export function phoneDigits(value?: string | null) {
  return normalizePhoneBR(value);
}

export function maskPhoneBR(value?: string | null) {
  const digits = normalizePhoneBR(value);
  const len = digits.length;

  if (len === 0) return "";
  if (len < 3) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  const isMobile = digits.length === 11;
  const firstPartLength = isMobile ? 5 : 4;

  if (rest.length <= firstPartLength) {
    return `(${ddd}) ${rest}`;
  }

  return `(${ddd}) ${rest.slice(0, firstPartLength)}-${rest.slice(firstPartLength)}`;
}

export function maskWhatsappBR(value?: string | null) {
  const digits = normalizePhoneBR(value);
  const len = digits.length;

  if (len === 0) return "";
  if (len < 3) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 5) {
    return `(${ddd}) ${rest}`;
  }

  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function isValidWhatsappBR(value?: string | null) {
  return normalizePhoneBR(value).length === 11;
}

export function isValidPhoneBR(value?: string | null) {
  const len = normalizePhoneBR(value).length;
  return len === 10 || len === 11;
}

export function formatPhone(value?: string | null) {
  const digits = normalizePhoneBR(value);

  if (digits.length !== 10 && digits.length !== 11) return "—";

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const firstPartLength = digits.length === 11 ? 5 : 4;

  return `(${ddd}) ${rest.slice(0, firstPartLength)}-${rest.slice(firstPartLength)}`;
}

export function toE164BR(value?: string | null) {
  const digits = normalizePhoneBR(value);

  if (!digits) return "";

  return `+55${digits}`;
}

export function fromE164BRToWhatsappInput(value?: string | null) {
  return maskWhatsappBR(value);
}
