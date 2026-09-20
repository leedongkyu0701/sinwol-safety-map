import {
  FACILITY_DATASETS,
  type FacilityDatasetDefinition,
} from "@/features/facilities/data/facility-datasets";
import type { Facility } from "@/shared/types/facility";
import { assertUniqueValues } from "@/shared/lib/validation";

async function loadFacilityDataset(
  dataset: FacilityDatasetDefinition,
  signal?: AbortSignal,
): Promise<Facility[]> {
  try {
    const response = await fetch(dataset.url, { signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw: unknown = await response.json();
    return dataset.schema.parse(raw);
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    throw new Error(`Failed to load ${dataset.category} dataset`, {
      cause: error,
    });
  }
}

export async function loadFacilities(
  signal?: AbortSignal,
): Promise<Facility[]> {
  const datasets = await Promise.all(
    FACILITY_DATASETS.map((dataset) =>
      loadFacilityDataset(dataset, signal),
    ),
  );
  const facilities = datasets.flat();

  assertUniqueValues(
    facilities.map((facility) => facility.id),
    "global facility id",
  );

  return facilities;
}
