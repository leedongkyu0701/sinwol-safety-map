import type { HeatShelterFacility } from "../../../../src/shared/types/facility";
import { CURRENT_HEAT_SHELTER_SNAPSHOT_BASELINE } from "./constants";
import type { HeatShelterTransformResult } from "./transform";

export interface HeatShelterAudit {
  sourceRows: number;
  pagesFetched: number;
  yearCounts: Record<string, number>;
  areaSelectedRows: number;
  addressSelectedRows: number;
  areaAddressMismatchIdentities: string[];
  publishedRows: number;
  facilityType1Counts: Record<string, number>;
  facilityType2Counts: Record<string, number>;
  regularOperatingHoursMissingCount: number;
  extendedFlagCounts: Record<string, number>;
  additionalFlagCounts: Record<string, number>;
  unknownDayTokens: string[];
  invalidHourGroups: string[];
  exactDuplicatesCollapsed: number;
  identityConflicts: string[];
  sameLocationGroups: HeatShelterTransformResult["sameLocationGroups"];
  coordinateRange: {
    latitude: { min: number; max: number } | undefined;
    longitude: { min: number; max: number } | undefined;
  };
  totalOtherRows: number;
  baselineMatches: boolean;
}

function range(values: readonly number[]): { min: number; max: number } | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function auditHeatShelterFacilities(
  sourceRows: number,
  pagesFetched: number,
  transformed: HeatShelterTransformResult,
  facilities: readonly HeatShelterFacility[],
  totalOtherRows: number,
): HeatShelterAudit {
  return {
    sourceRows,
    pagesFetched,
    yearCounts: transformed.yearCounts,
    areaSelectedRows: transformed.areaSelectedRows,
    addressSelectedRows: transformed.addressSelectedRows,
    areaAddressMismatchIdentities: transformed.areaAddressMismatchIdentities,
    publishedRows: facilities.length,
    facilityType1Counts: transformed.facilityType1Counts,
    facilityType2Counts: transformed.facilityType2Counts,
    regularOperatingHoursMissingCount: transformed.regularOperatingHoursMissingCount,
    extendedFlagCounts: transformed.extendedFlagCounts,
    additionalFlagCounts: transformed.additionalFlagCounts,
    unknownDayTokens: transformed.unknownDayTokens,
    invalidHourGroups: transformed.invalidHourGroups,
    exactDuplicatesCollapsed: transformed.exactDuplicatesCollapsed,
    identityConflicts: transformed.identityConflicts,
    sameLocationGroups: transformed.sameLocationGroups,
    coordinateRange: {
      latitude: range(facilities.map(({ latitude }) => latitude)),
      longitude: range(facilities.map(({ longitude }) => longitude)),
    },
    totalOtherRows,
    baselineMatches:
      sourceRows === CURRENT_HEAT_SHELTER_SNAPSHOT_BASELINE.sourceRows &&
      transformed.areaSelectedRows === CURRENT_HEAT_SHELTER_SNAPSHOT_BASELINE.selectedRows &&
      transformed.addressSelectedRows === CURRENT_HEAT_SHELTER_SNAPSHOT_BASELINE.selectedRows &&
      facilities.length === CURRENT_HEAT_SHELTER_SNAPSHOT_BASELINE.selectedRows,
  };
}

export function assertHeatShelterAudit(audit: HeatShelterAudit): void {
  if (audit.areaAddressMismatchIdentities.length > 0) {
    throw new Error(
      `Heat shelter AREA_CD and Sinwol address filters disagree for ${audit.areaAddressMismatchIdentities.length} canonical identity/identities; manual review is required`,
    );
  }
  if (audit.identityConflicts.length > 0) {
    throw new Error(
      `Heat shelter canonical identity conflicts require manual review: ${audit.identityConflicts.join(", ")}`,
    );
  }
  if (audit.unknownDayTokens.length > 0 || audit.invalidHourGroups.length > 0) {
    throw new Error("Heat shelter operating hours contain unknown days or invalid groups");
  }
  if (audit.publishedRows === 0) {
    throw new Error("Refusing to publish empty heat shelter dataset");
  }
}

function printCounts(label: string, counts: Record<string, number>): void {
  console.log(`${label}:`);
  for (const [value, count] of Object.entries(counts)) {
    console.log(`- ${value}: ${count}`);
  }
}

export function printHeatShelterAudit(audit: HeatShelterAudit): void {
  console.log("Heat Shelter ETL\n");
  console.log(`API total rows: ${audit.sourceRows.toLocaleString("en-US")}`);
  console.log(`Pages fetched: ${audit.pagesFetched}`);
  printCounts("YEAR distribution", audit.yearCounts);
  console.log(`AREA_CD-filtered rows: ${audit.areaSelectedRows}`);
  console.log(`Address-filtered Sinwol rows: ${audit.addressSelectedRows}`);
  console.log(`AREA/address mismatch rows: ${audit.areaAddressMismatchIdentities.length}`);
  for (const identity of audit.areaAddressMismatchIdentities.slice(0, 10)) {
    console.log(`- AREA/address mismatch identity: ${identity}`);
  }
  console.log(`Published rows: ${audit.publishedRows}`);
  printCounts("FACILITY_TYPE1", audit.facilityType1Counts);
  printCounts("FACILITY_TYPE2", audit.facilityType2Counts);
  console.log(`Regular operating hours missing: ${audit.regularOperatingHoursMissingCount}`);
  printCounts("Extended operating Y/N", audit.extendedFlagCounts);
  printCounts("Additional operating Y/N", audit.additionalFlagCounts);
  console.log(`Unknown day tokens: ${audit.unknownDayTokens.length}`);
  for (const issue of audit.unknownDayTokens) {
    console.log(`- ${issue}`);
  }
  console.log(`Invalid/incomplete hour groups: ${audit.invalidHourGroups.length}`);
  for (const issue of audit.invalidHourGroups) {
    console.log(`- ${issue}`);
  }
  console.log(`Exact duplicate rows collapsed: ${audit.exactDuplicatesCollapsed}`);
  console.log(`Identity conflicts: ${audit.identityConflicts.length}`);
  for (const sourceId of audit.identityConflicts) {
    console.log(`- manual review required: ${sourceId}`);
  }
  console.log(`Same-location groups: ${audit.sameLocationGroups.length}`);
  for (const group of audit.sameLocationGroups) {
    console.log(`- ${group.latitude}, ${group.longitude}: ${group.names.join(" | ")}`);
  }
  console.log("Coordinate range:");
  console.log(
    `- latitude: ${audit.coordinateRange.latitude === undefined ? "n/a" : `${audit.coordinateRange.latitude.min} ~ ${audit.coordinateRange.latitude.max}`}`,
  );
  console.log(
    `- longitude: ${audit.coordinateRange.longitude === undefined ? "n/a" : `${audit.coordinateRange.longitude.min} ~ ${audit.coordinateRange.longitude.max}`}`,
  );
  console.log(`Current snapshot baseline: ${audit.baselineMatches ? "MATCH" : "DIFF"}`);
  console.log(`Total OTHER rows after merge: ${audit.totalOtherRows}`);
}
