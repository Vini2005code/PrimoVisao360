import { getResourceData } from "./resources.service";
import type { ResourceOption, NationalityApiResponse } from "./types";

export async function getNationalityOptions(
  query: string,
): Promise<ResourceOption[]> {
  const data = await getResourceData<NationalityApiResponse>(
    "/nationalities",
    query,
  );

  return data.map(({ id, name }) => ({
    value: String(id),
    label: name,
  }));
}
