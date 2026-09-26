import { createHash } from "node:crypto";

import {
  normalizeOptionalString,
  normalizeRequiredString,
  parseRequiredNumber,
} from "../../../../src/shared/lib/normalize";
import {
  assertSeoulCoordinate,
  assertUniqueValues,
  createNamespacedId,
} from "../../../../src/shared/lib/validation";
import { heatShelterFacilitySchema } from "../../../../src/shared/schemas/facility";
import type { HeatShelterFacility } from "../../../../src/shared/types/facility";
import {
  HEAT_SHELTER_SOURCE_NAME,
  SINWOL_HEAT_SHELTER_ADDRESS,
  SINWOL_HEAT_SHELTER_AREA_CODES,
} from "./constants";
import { normalizeHeatShelterHours, normalizeOptionalHeatShelterHours } from "./operating-hours";
import type { HeatShelterSourceRow } from "./schema";

const areaCodeAllowlist = new Set<string>(SINWOL_HEAT_SHELTER_AREA_CODES);

function normalizeIdentityPart(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("ko-KR");
}

export function createHeatShelterCanonicalIdentity(
  row: HeatShelterSourceRow,
  rowNumber = 1,
): string {
  const areaCode = normalizeRequiredString(row.AREA_CD, `Heat shelter row ${rowNumber} AREA_CD`);
  const name = normalizeRequiredString(row.R_AREA_NM, `Heat shelter row ${rowNumber} R_AREA_NM`);
  const lotAddress = normalizeOptionalString(row.LOTNO_ADDR);
  const identityAddress = lotAddress ?? normalizeRequiredString(
    row.R_DETL_ADD,
    `Heat shelter row ${rowNumber} R_DETL_ADD (identity fallback)`,
  );

  return JSON.stringify([
    normalizeIdentityPart(areaCode),
    normalizeIdentityPart(name),
    normalizeIdentityPart(identityAddress),
  ]);
}

export function createHeatShelterSourceId(identity: string): string {
  return createHash("sha256").update(identity, "utf8").digest("hex");
}

function isSinwolAddressRow(row: HeatShelterSourceRow): boolean {
  return normalizeOptionalString(row.LOTNO_ADDR)?.includes(SINWOL_HEAT_SHELTER_ADDRESS) ?? false;
}

function transformRow(row: HeatShelterSourceRow, rowNumber: number): HeatShelterFacility {
  const identity = createHeatShelterCanonicalIdentity(row, rowNumber);
  const sourceId = createHeatShelterSourceId(identity);
  const name = normalizeRequiredString(row.R_AREA_NM, `Heat shelter ${sourceId} R_AREA_NM`);
  const roadAddress = normalizeOptionalString(row.R_DETL_ADD);
  const lotAddress = normalizeOptionalString(row.LOTNO_ADDR);
  const address = roadAddress ?? lotAddress;

  if (address === undefined) {
    throw new Error(`Heat shelter ${sourceId} has no publishable address`);
  }

  const latitude = parseRequiredNumber(row.LAT, `Heat shelter ${sourceId} LAT`);
  const longitude = parseRequiredNumber(row.LON, `Heat shelter ${sourceId} LON`);
  assertSeoulCoordinate(latitude, longitude);

  const regularHours = normalizeHeatShelterHours(
    { days: row.OPR_DAYS, start: row.OPR_START_TIME, end: row.OPR_END_TIME },
    `Heat shelter ${sourceId} regular hours`,
  );
  const extendedHours = normalizeOptionalHeatShelterHours(
    row.EXT_OPR_YN,
    { days: row.EXT_OPR_DAYS, start: row.EXT_OPR_START_TIME, end: row.EXT_OPR_END_TIME },
    `Heat shelter ${sourceId} extended hours`,
  );
  const additionalHours = normalizeOptionalHeatShelterHours(
    row.ADD_OPR_YN,
    { days: row.ADD_OPR_DAYS, start: row.ADD_OPR_START_TIME, end: row.ADD_OPR_END_TIME },
    `Heat shelter ${sourceId} additional hours`,
  );
  const facilityType1 = normalizeRequiredString(row.FACILITY_TYPE1, `Heat shelter ${sourceId} FACILITY_TYPE1`);
  const facilityType2 = normalizeRequiredString(row.FACILITY_TYPE2, `Heat shelter ${sourceId} FACILITY_TYPE2`);
  const remarks = normalizeOptionalString(row.RMRK);

  return heatShelterFacilitySchema.parse({
    id: createNamespacedId("heat-shelter", sourceId),
    category: "OTHER",
    subtype: "HEAT_SHELTER",
    name,
    latitude,
    longitude,
    address,
    ...(roadAddress === undefined ? {} : { roadAddress }),
    ...(lotAddress === undefined ? {} : { lotAddress }),
    source: HEAT_SHELTER_SOURCE_NAME,
    sourceId,
    details: {
      facilityType1,
      facilityType2,
      ...(regularHours === undefined ? {} : { regularHours }),
      ...(extendedHours === undefined ? {} : { extendedHours }),
      ...(additionalHours === undefined ? {} : { additionalHours }),
      ...(remarks === undefined ? {} : { remarks }),
    },
  });
}

export interface HeatShelterTransformResult {
  facilities: HeatShelterFacility[];
  areaSelectedRows: number;
  addressSelectedRows: number;
  areaAddressMismatchIdentities: string[];
  yearCounts: Record<string, number>;
  facilityType1Counts: Record<string, number>;
  facilityType2Counts: Record<string, number>;
  regularOperatingHoursMissingCount: number;
  extendedFlagCounts: Record<string, number>;
  additionalFlagCounts: Record<string, number>;
  exactDuplicatesCollapsed: number;
  identityConflicts: string[];
  unknownDayTokens: string[];
  invalidHourGroups: string[];
  sameLocationGroups: Array<{ latitude: number; longitude: number; names: string[] }>;
}

function countNormalizedValues(values: readonly (string | undefined)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = value ?? "<missing>";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function collectSameLocationGroups(facilities: readonly HeatShelterFacility[]) {
  const groups = new Map<string, HeatShelterFacility[]>();
  for (const facility of facilities) {
    const key = `${facility.latitude},${facility.longitude}`;
    groups.set(key, [...(groups.get(key) ?? []), facility]);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const [latitude, longitude] = key.split(",").map(Number);
      return { latitude, longitude, names: group.map(({ name }) => name).sort() };
    })
    .sort((left, right) => left.latitude - right.latitude || left.longitude - right.longitude);
}

export function transformHeatShelterRows(
  rows: readonly HeatShelterSourceRow[],
): HeatShelterTransformResult {
  const areaSelected = rows.flatMap((row, index) =>
    areaCodeAllowlist.has(normalizeRequiredString(row.AREA_CD, `Heat shelter row ${index + 1} AREA_CD`))
      ? [{ row, index }]
      : [],
  );
  const addressSelected = rows.flatMap((row, index) =>
    isSinwolAddressRow(row) ? [{ row, index }] : [],
  );
  const areaIdentitySet = new Set(areaSelected.map(({ row, index }) => createHeatShelterCanonicalIdentity(row, index + 1)));
  const addressIdentitySet = new Set(addressSelected.map(({ row, index }) => createHeatShelterCanonicalIdentity(row, index + 1)));
  const areaAddressMismatchIdentities = [...new Set([
    ...[...areaIdentitySet].filter((identity) => !addressIdentitySet.has(identity)),
    ...[...addressIdentitySet].filter((identity) => !areaIdentitySet.has(identity)),
  ])].sort();

  const bySourceId = new Map<string, HeatShelterFacility>();
  const identityConflicts = new Set<string>();
  const unknownDayTokens = new Set<string>();
  const invalidHourGroups = new Set<string>();
  let exactDuplicatesCollapsed = 0;
  const publishableRows: HeatShelterFacility[] = [];
  for (const { row, index } of areaSelected) {
    let facility: HeatShelterFacility;
    try {
      facility = transformRow(row, index + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("unknown weekday token")) {
        unknownDayTokens.add(message);
        continue;
      }
      if (message.toLowerCase().includes("hours")) {
        invalidHourGroups.add(message);
        continue;
      }
      throw error;
    }
    const existing = bySourceId.get(facility.sourceId);
    if (existing === undefined) {
      bySourceId.set(facility.sourceId, facility);
      publishableRows.push(facility);
    } else if (JSON.stringify(existing) === JSON.stringify(facility)) {
      exactDuplicatesCollapsed += 1;
    } else {
      identityConflicts.add(facility.sourceId);
    }
  }
  const facilities = publishableRows
    .filter((facility) => !identityConflicts.has(facility.sourceId))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));

  assertUniqueValues(facilities.map((facility) => facility.sourceId), "heat shelter sourceId");
  assertUniqueValues(facilities.map((facility) => facility.id), "heat shelter facility id");

  return {
    facilities,
    areaSelectedRows: areaSelected.length,
    addressSelectedRows: addressSelected.length,
    areaAddressMismatchIdentities,
    yearCounts: countNormalizedValues(rows.map((row) => normalizeOptionalString(row.YEAR))),
    facilityType1Counts: countNormalizedValues(facilities.map((facility) => facility.details.facilityType1)),
    facilityType2Counts: countNormalizedValues(facilities.map((facility) => facility.details.facilityType2)),
    regularOperatingHoursMissingCount: facilities.filter((facility) => facility.details.regularHours === undefined).length,
    extendedFlagCounts: countNormalizedValues(areaSelected.map(({ row }) => normalizeOptionalString(row.EXT_OPR_YN))),
    additionalFlagCounts: countNormalizedValues(areaSelected.map(({ row }) => normalizeOptionalString(row.ADD_OPR_YN))),
    exactDuplicatesCollapsed,
    identityConflicts: [...identityConflicts].sort(),
    unknownDayTokens: [...unknownDayTokens].sort(),
    invalidHourGroups: [...invalidHourGroups].sort(),
    sameLocationGroups: collectSameLocationGroups(facilities),
  };
}
