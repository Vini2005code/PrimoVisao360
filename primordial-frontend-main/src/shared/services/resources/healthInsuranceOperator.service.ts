import { getResourceData } from "./resources.service";
import type {
  ResourceOption,
  HealthInsuranceOperatorApiResponse,
} from "./types";

export async function getHealthInsuranceOperatorOptions(
  query: string,
): Promise<ResourceOption[]> {
  const data = await getResourceData<HealthInsuranceOperatorApiResponse>(
    "/health-insurance-operators",
    query,
  );

  return data.map(({ id, name }) => ({
    value: String(id),
    label: name,
  }));
}
