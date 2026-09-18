export const SEOUL_COORDINATE_RANGE = {
  latitude: { min: 37.3, max: 37.8 },
  longitude: { min: 126.7, max: 127.3 },
} as const;

export type FacilityIdNamespace =
  | "fire-water"
  | "shelter"
  | "aed"
  | "fire-org";

export interface ReasonableRecordCountOptions {
  label: string;
  nextCount: number;
  previousCount?: number;
  maxDecreaseRatio: number;
}

export function createNamespacedId(
  namespace: FacilityIdNamespace,
  sourceId: string,
): string {
  const normalizedSourceId = sourceId.trim();

  if (normalizedSourceId.length === 0) {
    throw new Error("sourceId is required to create a namespaced id");
  }

  return `${namespace}:${normalizedSourceId}`;
}

export function hasNamespacedId(
  namespace: FacilityIdNamespace,
  id: string,
  sourceId: string,
): boolean {
  return id === createNamespacedId(namespace, sourceId);
}

export function assertReasonableRecordCount({
  label,
  nextCount,
  previousCount,
  maxDecreaseRatio,
}: ReasonableRecordCountOptions): void {
  if (!Number.isInteger(nextCount) || nextCount < 0) {
    throw new Error(`${label} next count must be a non-negative integer`);
  }

  if (nextCount === 0) {
    throw new Error(`Refusing to publish empty ${label} dataset`);
  }

  if (maxDecreaseRatio < 0 || maxDecreaseRatio > 1) {
    throw new Error("maxDecreaseRatio must be between 0 and 1");
  }

  if (previousCount === undefined) {
    return;
  }

  if (!Number.isInteger(previousCount) || previousCount < 0) {
    throw new Error(`${label} previous count must be a non-negative integer`);
  }

  if (previousCount === 0 || nextCount >= previousCount) {
    return;
  }

  const decreaseRatio = (previousCount - nextCount) / previousCount;

  if (decreaseRatio > maxDecreaseRatio) {
    throw new Error(
      `Refusing to publish ${label} dataset: count decreased from ${previousCount} to ${nextCount} (${(decreaseRatio * 100).toFixed(1)}%, allowed ${(maxDecreaseRatio * 100).toFixed(1)}%)`,
    );
  }
}

export function assertSeoulCoordinate(
  latitude: number,
  longitude: number,
): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}`);
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}`);
  }

  if (
    latitude < SEOUL_COORDINATE_RANGE.latitude.min ||
    latitude > SEOUL_COORDINATE_RANGE.latitude.max ||
    longitude < SEOUL_COORDINATE_RANGE.longitude.min ||
    longitude > SEOUL_COORDINATE_RANGE.longitude.max
  ) {
    throw new Error(
      `Coordinate is outside the Seoul sanity range: ${latitude}, ${longitude}`,
    );
  }
}

export function findDuplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return [...duplicates].sort();
}

export function assertUniqueValues(
  values: readonly string[],
  label: string,
): void {
  const duplicates = findDuplicateValues(values);

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate ${label} values found (${duplicates.length}): ${duplicates
        .slice(0, 10)
        .join(", ")}`,
    );
  }
}
