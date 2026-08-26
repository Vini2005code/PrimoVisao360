export function cpfDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 11);
}

export function maskCpf(value?: string | null) {
  const d = cpfDigits(value);

  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;

  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function hasInvalidCpfChars(value?: string | null) {
  return /[^\d.\-\s]/.test(value ?? "");
}

export function isValidCpf(value?: string | null) {
  const cpf = cpfDigits(value);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcCheckDigit = (base: string, factor: number) => {
    let sum = 0;

    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factor - i);
    }

    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calcCheckDigit(cpf.slice(0, 9), 10);
  const d2 = calcCheckDigit(cpf.slice(0, 9) + String(d1), 11);

  return cpf === cpf.slice(0, 9) + String(d1) + String(d2);
}

export function formatCpf(value?: string | null) {
  const cpf = cpfDigits(value);

  if (cpf.length !== 11) return "—";

  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}
