import { getResourceData } from "./resources.service";
import type { ResourceOption, MunicipalityApiResponse } from "./types";

export async function getMunicipalityOptions(
  query: string,
): Promise<ResourceOption[]> {
  const data = await getResourceData<MunicipalityApiResponse>(
    "/municipalities",
    query,
  );

  return data.map(({ id, name, uf }) => ({
    value: String(id),
    label: `${name} - ${uf}`,
  }));
}
