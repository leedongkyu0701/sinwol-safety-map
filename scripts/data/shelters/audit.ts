import { findDuplicateValues } from "../../../src/shared/lib/validation";
import type { ShelterFacility } from "../../../src/shared/types/facility";
import { CURRENT_SHELTER_SNAPSHOT_BASELINE } from "./constants";
import type { ShelterTransformResult } from "./transform";

export interface DuplicateCoordinateGroup {
  latitude: number;
  longitude: number;
  facilities: Array<{
    sourceId: string;
    name: string;
  }>;
}

export interface ShelterAudit {
  sourceRows: number;
  yangcheonRows: number;
  sinwolRows: number;
  activeRows: number;
  inactiveRows: number;
  publishedRows: number;
  statusCounts: Record<string, number>;
  unknownStatuses: string[];
  missing: {
    sourceId: number;
    name: number;
    address: number;
    coordinate: number;
  };
  duplicate: {
    sourceId: string[];
    id: string[];
  };
  duplicateCoordinateGroups: DuplicateCoordinateGroup[];
  coordinateRange: {
    latitude: { min: number; max: number };
    longitude: { min: number; max: number };
  };
  baselineMatches: boolean;
}

function range(values: readonly number[]): { min: number; max: number } {
  if (values.length === 0) {
    throw new Error("Cannot calculate a coordinate range for an empty dataset");
  }

  return { min: Math.min(...values), max: Math.max(...values) };
}

function findDuplicateCoordinateGroups(
  facilities: readonly ShelterFacility[],
): DuplicateCoordinateGroup[] {
  const groups = new Map<string, ShelterFacility[]>();

  for (const facility of facilities) {
    const key = `${facility.latitude},${facility.longitude}`;
    groups.set(key, [...(groups.get(key) ?? []), facility]);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([, group]) => ({
      latitude: group[0].latitude,
      longitude: group[0].longitude,
      facilities: group.map((facility) => ({
        sourceId: facility.sourceId,
        name: facility.name,
      })),
    }))
    .sort((left, right) =>
      left.latitude === right.latitude
        ? left.longitude - right.longitude
        : left.latitude - right.latitude,
    );
}

export function auditShelterFacilities(
  facilities: readonly ShelterFacility[],
  sourceRows: number,
  transformed: ShelterTransformResult,
): ShelterAudit {
  const duplicate = {
    sourceId: findDuplicateValues(
      facilities.map((facility) => facility.sourceId),
    ),
    id: findDuplicateValues(facilities.map((facility) => facility.id)),
  };
  const missing = {
    sourceId: facilities.filter((facility) => facility.sourceId.length === 0)
      .length,
    name: facilities.filter((facility) => facility.name.length === 0).length,
    address: facilities.filter((facility) => facility.address.length === 0)
      .length,
    coordinate: facilities.filter(
      (facility) =>
        !Number.isFinite(facility.latitude) ||
        !Number.isFinite(facility.longitude),
    ).length,
  };
  const baselineMatches =
    sourceRows === CURRENT_SHELTER_SNAPSHOT_BASELINE.sourceRows &&
    transformed.yangcheonRows ===
      CURRENT_SHELTER_SNAPSHOT_BASELINE.yangcheonRows &&
    transformed.sinwolRows === CURRENT_SHELTER_SNAPSHOT_BASELINE.sinwolRows &&
    transformed.activeRows === CURRENT_SHELTER_SNAPSHOT_BASELINE.activeRows &&
    transformed.inactiveRows ===
      CURRENT_SHELTER_SNAPSHOT_BASELINE.inactiveRows &&
    facilities.length === CURRENT_SHELTER_SNAPSHOT_BASELINE.publishedRows;

  return {
    sourceRows,
    yangcheonRows: transformed.yangcheonRows,
    sinwolRows: transformed.sinwolRows,
    activeRows: transformed.activeRows,
    inactiveRows: transformed.inactiveRows,
    publishedRows: facilities.length,
    statusCounts: transformed.statusCounts,
    unknownStatuses: transformed.unknownStatuses,
    missing,
    duplicate,
    duplicateCoordinateGroups: findDuplicateCoordinateGroups(facilities),
    coordinateRange: {
      latitude: range(facilities.map((facility) => facility.latitude)),
      longitude: range(facilities.map((facility) => facility.longitude)),
    },
    baselineMatches,
  };
}

export function assertShelterAudit(audit: ShelterAudit): void {
  if (audit.publishedRows === 0) {
    throw new Error("Refusing to publish empty shelter dataset");
  }

  if (audit.unknownStatuses.length > 0) {
    throw new Error(
      `Unknown shelter statuses found in Sinwol rows: ${audit.unknownStatuses.join(", ")}`,
    );
  }

  if (Object.values(audit.missing).some((count) => count > 0)) {
    throw new Error("Published shelter data has missing required fields");
  }

  if (audit.duplicate.sourceId.length > 0 || audit.duplicate.id.length > 0) {
    throw new Error("Published shelter data has duplicate identifiers");
  }
}

export function printShelterAudit(audit: ShelterAudit): void {
  console.log("Shelter ETL\n");
  console.log(`Source rows: ${audit.sourceRows.toLocaleString("en-US")}`);
  console.log(`Yangcheon rows: ${audit.yangcheonRows.toLocaleString("en-US")}`);
  console.log(`Sinwol rows: ${audit.sinwolRows.toLocaleString("en-US")}`);
  console.log(`Active rows: ${audit.activeRows.toLocaleString("en-US")}`);
  console.log(`Inactive rows: ${audit.inactiveRows.toLocaleString("en-US")}`);
  console.log(`Published rows: ${audit.publishedRows.toLocaleString("en-US")}`);
  console.log("\nStatus:");

  for (const [status, count] of Object.entries(audit.statusCounts).sort()) {
    console.log(`- ${status}: ${count}`);
  }

  console.log("\nMissing required fields:");
  console.log(`- sourceId: ${audit.missing.sourceId}`);
  console.log(`- name: ${audit.missing.name}`);
  console.log(`- address: ${audit.missing.address}`);
  console.log(`- coordinate: ${audit.missing.coordinate}`);
  console.log("\nDuplicate:");
  console.log(`- sourceId: ${audit.duplicate.sourceId.length}`);
  console.log(`- id: ${audit.duplicate.id.length}`);
  console.log(
    `\nDuplicate coordinate groups: ${audit.duplicateCoordinateGroups.length}`,
  );

  for (const group of audit.duplicateCoordinateGroups.slice(0, 5)) {
    console.log(
      `- ${group.latitude}, ${group.longitude}: ${group.facilities.map((facility) => `${facility.sourceId} (${facility.name})`).join(" | ")}`,
    );
  }

  console.log("\nCoordinate range:");
  console.log(
    `- latitude: ${audit.coordinateRange.latitude.min} ~ ${audit.coordinateRange.latitude.max}`,
  );
  console.log(
    `- longitude: ${audit.coordinateRange.longitude.min} ~ ${audit.coordinateRange.longitude.max}`,
  );
  console.log(
    `\nCurrent snapshot baseline: ${audit.baselineMatches ? "MATCH" : "DIFF"}`,
  );
}
