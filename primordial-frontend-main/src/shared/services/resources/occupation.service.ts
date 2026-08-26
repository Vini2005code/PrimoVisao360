import { getResourceData } from "./resources.service";
import type { ResourceOption, OccupationApiResponse } from "./types";

export async function getOccupationOptions(
  query: string,
): Promise<ResourceOption[]> {
  const data = await getResourceData<OccupationApiResponse>(
    "/occupations",
    query,
  );

  return data.map(({ id, code, title }) => ({
    value: String(id),
    label: code ? `${code} - ${title}` : title,
  }));
}
