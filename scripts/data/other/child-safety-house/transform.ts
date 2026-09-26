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
};

function normalizedReviewText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
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
