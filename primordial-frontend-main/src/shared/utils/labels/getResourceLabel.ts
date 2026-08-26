export function getResourceLabel(type: string, data: unknown) {
  if (!data) return "—";

  if (type === "municipality") {
    const m = data as { name: string; uf: string };
    return `${m.name} - ${m.uf}`;
  }

  if (type === "occupation") {
    const o = data as { code?: string | null; title?: string | null };
    if (!o.title) return "—";
    return o.code ? `${o.code} - ${o.title}` : o.title;
  }

  const d = data as { name?: string | null };
  return d.name ?? "—";
}
