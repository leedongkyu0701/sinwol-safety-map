import {
  assertSeoulCoordinate,
  createNamespacedId,
} from "../../../../src/shared/lib/validation";
import { normalizeOptionalString, parseRequiredNumber } from "../../../../src/shared/lib/normalize";
import type { ChildSafetyHouseFacility } from "../../../../src/shared/types/facility";
import {
  CHILD_SAFETY_HOUSE_CANDIDATE_ADDRESS_TOKEN,
  CHILD_SAFETY_HOUSE_CLASS_CODE,
  CHILD_SAFETY_HOUSE_CLASS_NAME,
  CHILD_SAFETY_HOUSE_DUPLICATE_COORDINATE_DISTANCE_METERS,
  CHILD_SAFETY_HOUSE_SOURCE_NAME,
} from "./constants";
import type {
  ChildSafetyHouseReference,
  ChildSafetyHouseSourceRow,
} from "./schema";

export interface ChildSafetyHouseTransformResult {
  facilities: ChildSafetyHouseFacility[];
  candidates: Array<{
    sourceId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }>;
  includeCount: number;
  excludeCount: number;
  pendingCandidates: Array<{
    sourceId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }>;
  staleReferenceIds: string[];
  mismatchedReferenceIds: string[];
  malformedPhoneCount: number;
  omittedPhoneCount: number;
  exactDuplicatesCollapsed: number;
  duplicateSourceIds: string[];
  sameLocationGroups: Array<{ coordinate: string; sourceIds: string[] }>;
  probableDuplicateGroups: ChildSafetyHouseProbableDuplicateGroup[];
};

export interface ChildSafetyHouseProbableDuplicateGroup {
  records: Array<{
    sourceId: string;
    name: string;
    address: string;
    phone?: string;
    latitude: number;
    longitude: number;
  }>;
  comparisons: Array<{
    sourceIds: [string, string];
    sameNormalizedName: boolean;
    sameNormalizedAddress: boolean;
    samePhone: boolean;
    distanceMeters: number;
  }>;
}

function normalizedReviewText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizedReviewAddress(value: string): string {
  return normalizedReviewText(value)
    .replace(/^서울특별시(?= 양천구)/u, "서울")
    .replace(/(\d+)-0(?=[,\s]|$)/gu, "$1");
}

function distanceInMeters(
  first: Pick<ChildSafetyHouseFacility, "latitude" | "longitude">,
  second: Pick<ChildSafetyHouseFacility, "latitude" | "longitude">,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(first.latitude)) *
      Math.cos(toRadians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

export function findChildSafetyHouseProbableDuplicateGroups(
  facilities: readonly ChildSafetyHouseFacility[],
): ChildSafetyHouseProbableDuplicateGroup[] {
  const parentById = new Map(
    facilities.map((facility) => [facility.sourceId, facility.sourceId]),
  );
  const findRoot = (sourceId: string): string => {
    const parent = parentById.get(sourceId);
    if (parent === undefined || parent === sourceId) return sourceId;
    const root = findRoot(parent);
    parentById.set(sourceId, root);
    return root;
  };
  const comparisons: ChildSafetyHouseProbableDuplicateGroup["comparisons"] = [];

  for (let firstIndex = 0; firstIndex < facilities.length; firstIndex += 1) {
    const first = facilities[firstIndex];
    if (first === undefined) continue;

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < facilities.length;
      secondIndex += 1
    ) {
      const second = facilities[secondIndex];
      if (second === undefined || first.sourceId === second.sourceId) continue;

      const sameNormalizedName =
        normalizedReviewText(first.name) === normalizedReviewText(second.name);
      if (!sameNormalizedName) continue;

      const sameNormalizedAddress =
        normalizedReviewAddress(first.address) ===
        normalizedReviewAddress(second.address);
      const samePhone =
        first.details.phone !== undefined &&
        first.details.phone === second.details.phone;
      const distanceMeters = distanceInMeters(first, second);

      if (
        !sameNormalizedAddress &&
        !(samePhone && distanceMeters <= CHILD_SAFETY_HOUSE_DUPLICATE_COORDINATE_DISTANCE_METERS)
      ) {
        continue;
      }

      comparisons.push({
        sourceIds: [first.sourceId, second.sourceId],
        sameNormalizedName,
        sameNormalizedAddress,
        samePhone,
        distanceMeters,
      });
      const firstRoot = findRoot(first.sourceId);
      const secondRoot = findRoot(second.sourceId);
      if (firstRoot !== secondRoot) parentById.set(secondRoot, firstRoot);
    }
  }

  const facilitiesByRoot = new Map<string, ChildSafetyHouseFacility[]>();
  for (const facility of facilities) {
    const root = findRoot(facility.sourceId);
    const group = facilitiesByRoot.get(root) ?? [];
    group.push(facility);
    facilitiesByRoot.set(root, group);
  }

  return [...facilitiesByRoot.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const ordered = [...group].sort((first, second) =>
        first.sourceId.localeCompare(second.sourceId),
      );
      const sourceIds = new Set(ordered.map((facility) => facility.sourceId));
      return {
        records: ordered.map((facility) => ({
          sourceId: facility.sourceId,
          name: facility.name,
          address: facility.address,
          ...(facility.details.phone === undefined
            ? {}
            : { phone: facility.details.phone }),
          latitude: facility.latitude,
          longitude: facility.longitude,
        })),
        comparisons: comparisons
          .filter((comparison) =>
            comparison.sourceIds.every((id) => sourceIds.has(id)),
          )
          .sort((first, second) =>
            first.sourceIds.join(":").localeCompare(second.sourceIds.join(":")),
          ),
      };
    })
    .sort((first, second) =>
      first.records[0]?.sourceId.localeCompare(second.records[0]?.sourceId ?? "") ?? 0,
    );
}

export function findReviewedDuplicateExclusionSourceIds(
  reference: ChildSafetyHouseReference,
  existingSourceIds: ReadonlySet<string>,
): string[] {
  const decisionsById = new Map(
    reference.decisions.map((decision) => [decision.sourceId, decision]),
  );
  const duplicateReasonPattern =
    /^sourceId (\d+)와 동일 실제 시설(?: 및 전화번호)?로 확인된 SafeDream 중복 레코드$/u;

  return reference.decisions
    .filter((decision) => {
      if (
        decision.decision !== "EXCLUDE" ||
        !existingSourceIds.has(decision.sourceId)
      ) {
        return false;
      }

      const match = decision.reason?.match(duplicateReasonPattern);
      if (match === undefined || match === null) return false;

      const representativeSourceId = match[1];
      const representative =
        representativeSourceId === undefined
          ? undefined
          : decisionsById.get(representativeSourceId);
      if (representative?.decision !== "INCLUDE") {
        throw new Error(
          `Reviewed duplicate exclusion ${decision.sourceId} must reference an INCLUDE representative`,
        );
      }

      return true;
    })
    .map((decision) => decision.sourceId)
    .sort();
}

function sourceText(value: unknown): string | undefined {
  return normalizeOptionalString(value);
}

export function normalizeChildSafetyHousePhone(
  value: unknown,
): { phone?: string; malformed: boolean } {
  const phone = sourceText(value);
  if (phone === undefined) return { malformed: false };
  const digits = phone.replace(/[()\s.-]/g, "");
  if (!/^\+?\d{7,15}$/.test(digits) || /^0\d{1,2}0{6,}$/.test(digits)) {
    return { malformed: true };
  }
  return { phone, malformed: false };
}

function sourceIdOf(row: ChildSafetyHouseSourceRow): string {
  const value = row.lcSn;
  const sourceId = typeof value === "number" ? String(value) : sourceText(value);
  if (sourceId === undefined || !/^\d+$/.test(sourceId)) {
    throw new Error(`Invalid SafeDream lcSn source identity: ${String(value)}`);
  }
  return sourceId;
}

interface NormalizedRow {
  sourceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  detailLocation?: string;
  phone?: string;
  malformedPhone: boolean;
}

function normalizeRow(row: ChildSafetyHouseSourceRow): NormalizedRow {
  const sourceId = sourceIdOf(row);
  if (sourceText(row.cl) !== CHILD_SAFETY_HOUSE_CLASS_CODE) {
    throw new Error(`Unexpected SafeDream cl for lcSn ${sourceId}`);
  }
  if (sourceText(row.clNm) !== CHILD_SAFETY_HOUSE_CLASS_NAME) {
    throw new Error(`Unexpected SafeDream clNm for lcSn ${sourceId}`);
  }
  const name = sourceText(row.bsshNm);
  const address = sourceText(row.adres);
  if (name === undefined || address === undefined) {
    throw new Error(`SafeDream row ${sourceId} is missing name or address`);
  }
  const latitude = parseRequiredNumber(row.lcinfoLa, `lcSn ${sourceId} latitude`);
  const longitude = parseRequiredNumber(row.lcinfoLo, `lcSn ${sourceId} longitude`);
  const etcAddress = sourceText(row.etcAdres);
  const detailLocation =
    etcAddress !== undefined &&
    !normalizedReviewText(address).includes(normalizedReviewText(etcAddress))
      ? etcAddress
      : undefined;
  const phoneResult = normalizeChildSafetyHousePhone(row.telno);
  return {
    sourceId,
    name,
    address,
    latitude,
    longitude,
    detailLocation,
    phone: phoneResult.phone,
    malformedPhone: phoneResult.malformed,
  };
}

function publishableValues(row: NormalizedRow): string {
  return JSON.stringify({
    sourceId: row.sourceId,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    detailLocation: row.detailLocation,
    phone: row.phone,
  });
}

export function transformChildSafetyHouseRows(
  rows: readonly ChildSafetyHouseSourceRow[],
  reference: ChildSafetyHouseReference,
): ChildSafetyHouseTransformResult {
  const normalizedById = new Map<string, NormalizedRow>();
  const duplicateSourceIds = new Set<string>();
  let exactDuplicatesCollapsed = 0;
  for (const sourceRow of rows) {
    if (sourceText(sourceRow.cl) !== CHILD_SAFETY_HOUSE_CLASS_CODE) {
      throw new Error(`Unexpected SafeDream cl for lcSn ${String(sourceRow.lcSn)}`);
    }
    if (sourceText(sourceRow.clNm) !== CHILD_SAFETY_HOUSE_CLASS_NAME) {
      throw new Error(`Unexpected SafeDream clNm for lcSn ${String(sourceRow.lcSn)}`);
    }
    const rawAddress = sourceText(sourceRow.adres);
    if (
      rawAddress === undefined ||
      !normalizedReviewText(rawAddress).includes(CHILD_SAFETY_HOUSE_CANDIDATE_ADDRESS_TOKEN)
    ) {
      continue;
    }
    const row = normalizeRow(sourceRow);
    const previous = normalizedById.get(row.sourceId);
    if (previous === undefined) {
      normalizedById.set(row.sourceId, row);
    } else if (publishableValues(previous) === publishableValues(row)) {
      exactDuplicatesCollapsed += 1;
      duplicateSourceIds.add(row.sourceId);
    } else {
      throw new Error(
        `SafeDream identity conflict for lcSn ${row.sourceId}; publishable values differ. Manual review required.`,
      );
    }
  }

  const byId = new Map([...normalizedById.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const referenceById = new Map(reference.decisions.map((decision) => [decision.sourceId, decision]));
  const candidates = [...byId.values()]
    .filter((row) => normalizedReviewText(row.address).includes(CHILD_SAFETY_HOUSE_CANDIDATE_ADDRESS_TOKEN))
    .map(({ sourceId, name, address, latitude, longitude }) => ({ sourceId, name, address, latitude, longitude }));
  const candidateIds = new Set(candidates.map((candidate) => candidate.sourceId));
  const pendingCandidates = candidates.filter((candidate) => !referenceById.has(candidate.sourceId));
  const staleReferenceIds = reference.decisions
    .filter((decision) => !byId.has(decision.sourceId))
    .map((decision) => decision.sourceId)
    .sort();
  const mismatchedReferenceIds: string[] = [];
  let includeCount = 0;
  let excludeCount = 0;
  const facilities: ChildSafetyHouseFacility[] = [];
  let malformedPhoneCount = 0;
  let omittedPhoneCount = 0;

  for (const candidate of candidates) {
    const decision = referenceById.get(candidate.sourceId);
    if (decision === undefined) continue;
    if (!candidateIds.has(decision.sourceId)) continue;
    const row = byId.get(decision.sourceId)!;
    if (
      normalizedReviewText(row.name) !== normalizedReviewText(decision.expectedName) ||
      normalizedReviewText(row.address) !== normalizedReviewText(decision.expectedAddress)
    ) {
      mismatchedReferenceIds.push(row.sourceId);
      continue;
    }
    if (decision.decision === "EXCLUDE") {
      excludeCount += 1;
      continue;
    }
    // Scope decisions are authoritative; this is only a sanity check for rows we publish.
    assertSeoulCoordinate(row.latitude, row.longitude);
    includeCount += 1;
    if (row.phone === undefined) omittedPhoneCount += 1;
    if (row.malformedPhone) malformedPhoneCount += 1;
    facilities.push({
      id: createNamespacedId("child-safety-house", row.sourceId),
      category: "OTHER",
      subtype: "CHILD_SAFETY_HOUSE",
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address,
      ...(row.detailLocation === undefined ? {} : { detailLocation: row.detailLocation }),
      source: CHILD_SAFETY_HOUSE_SOURCE_NAME,
      sourceId: row.sourceId,
      details: row.phone === undefined ? {} : { phone: row.phone },
    });
  }

  const locationMap = new Map<string, string[]>();
  for (const facility of facilities) {
    const key = `${facility.latitude},${facility.longitude}`;
    locationMap.set(key, [...(locationMap.get(key) ?? []), String(facility.sourceId)]);
  }
  const sameLocationGroups = [...locationMap.entries()]
    .filter(([, sourceIds]) => sourceIds.length > 1)
    .map(([coordinate, sourceIds]) => ({ coordinate, sourceIds: sourceIds.sort() }));
  const probableDuplicateGroups = findChildSafetyHouseProbableDuplicateGroups(facilities);

  return {
    facilities,
    candidates,
    includeCount,
    excludeCount,
    pendingCandidates,
    staleReferenceIds,
    mismatchedReferenceIds: mismatchedReferenceIds.sort(),
    malformedPhoneCount,
    omittedPhoneCount,
    exactDuplicatesCollapsed,
    duplicateSourceIds: [...duplicateSourceIds].sort(),
    sameLocationGroups,
    probableDuplicateGroups,
  };
}

export function assertChildSafetyHouseReview(
  result: ChildSafetyHouseTransformResult,
): void {
  if (result.pendingCandidates.length > 0) {
    const pending = result.pendingCandidates
      .map((candidate) => `${candidate.sourceId}\t${candidate.name}\t${candidate.address}\t${candidate.latitude},${candidate.longitude}`)
      .join("\n");
    throw new Error(`Unreviewed Yangcheon-gu candidates; review scope and add decisions before publishing:\n${pending}`);
  }
  if (result.staleReferenceIds.length > 0) {
    throw new Error(`Reference rows missing from current Source: ${result.staleReferenceIds.join(", ")}`);
  }
  if (result.mismatchedReferenceIds.length > 0) {
    throw new Error(`Reference name/address changed; manual review required for lcSn: ${result.mismatchedReferenceIds.join(", ")}`);
  }
  if (result.facilities.length === 0) {
    throw new Error("No reviewed child safety house facilities selected for publishing");
  }
}
