type AgeParts = {
  years: number;
  months: number;
  days: number;
};

export function getAgeParts(birthDate?: string | Date | null): AgeParts | null {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const today = new Date();

  if (Number.isNaN(birth.getTime())) return null;
  if (birth > today) return null;

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    const previousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += previousMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days };
}

export function calculateAge(dateString?: string): number | undefined {
  const ageParts = getAgeParts(dateString);

  if (!ageParts) return undefined;

  return ageParts.years;
}

export function formatFullAge(birthDate?: string | Date | null): string {
  const ageParts = getAgeParts(birthDate);

  if (!ageParts) return "--";

  const { years, months, days } = ageParts;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ano${years > 1 ? "s" : ""}`);
  }

  if (months > 0) {
    parts.push(`${months} ${months > 1 ? "meses" : "mês"}`);
  }

  if (days > 0) {
    parts.push(`${days} dia${days > 1 ? "s" : ""}`);
  }

  if (parts.length === 0) {
    return "0 dias";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} e ${parts[1]}`;
  }

  return `${parts[0]}, ${parts[1]} e ${parts[2]}`;
}
