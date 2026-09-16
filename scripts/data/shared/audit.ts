import type {
  FireWaterFacility,
  FireWaterSubtype,
} from "../../../src/shared/types/facility";
import { FIRE_WATER_SUBTYPES } from "../../../src/shared/types/facility";
import { findDuplicateValues } from "../../../src/shared/lib/validation";

import { CURRENT_SNAPSHOT_BASELINE } from "../fire-water/constants";

export interface FireWaterAudit {
  sourceRows: number;
  yangcheonRows: number;
  sinwolRows: number;
  publishedRows: number;
  subtypeCounts: Record<FireWaterSubtype, number>;
  missing: {
    id: number;
    address: number;
    coordinate: number;
  };
  duplicate: {
    sourceId: string[];
    id: string[];
  };
  coordinateRange: {
    latitude: { min: number; max: number };
    longitude: { min: number; max: number };
  };
  missingDetailLocation: number;
  sourceUnknownSubtypeCodes: string[];
  baselineMatches: boolean;
}

function range(values: readonly number[]): { min: number; max: number } {
  if (values.length === 0) {
    throw new Error("Cannot calculate a coordinate range for an empty dataset");
  }

  return { min: Math.min(...values), max: Math.max(...values) };
}

export function auditFireWaterFacilities(
  facilities: readonly FireWaterFacility[],
  counts: {
    sourceRows: number;
    yangcheonRows: number;
    sinwolRows: number;
    sourceUnknownSubtypeCodes: string[];
  },
): FireWaterAudit {
  const subtypeCounts = Object.fromEntries(
    FIRE_WATER_SUBTYPES.map((subtype) => [subtype, 0]),
  ) as Record<FireWaterSubtype, number>;

  for (const facility of facilities) {
    subtypeCounts[facility.subtype] += 1;
  }

  const missing = {
    id: facilities.filter((facility) => facility.id.length === 0).length,
    address: facilities.filter((facility) => facility.address.length === 0).length,
    coordinate: facilities.filter(
      (facility) =>
        !Number.isFinite(facility.latitude) ||
        !Number.isFinite(facility.longitude),
    ).length,
  };
  const duplicate = {
    sourceId: findDuplicateValues(
      facilities.map((facility) => facility.sourceId),
    ),
    id: findDuplicateValues(facilities.map((facility) => facility.id)),
  };

  const baselineMatches =
    counts.sourceRows === CURRENT_SNAPSHOT_BASELINE.sourceRows &&
    counts.yangcheonRows === CURRENT_SNAPSHOT_BASELINE.yangcheonRows &&
    counts.sinwolRows === CURRENT_SNAPSHOT_BASELINE.sinwolRows &&
    facilities.length === CURRENT_SNAPSHOT_BASELINE.sinwolRows &&
    FIRE_WATER_SUBTYPES.every(
      (subtype) =>
        subtypeCounts[subtype] ===
        CURRENT_SNAPSHOT_BASELINE.subtypeCounts[subtype],
    );

  return {
    ...counts,
    publishedRows: facilities.length,
    subtypeCounts,
    missing,
    duplicate,
    coordinateRange: {
      latitude: range(facilities.map((facility) => facility.latitude)),
      longitude: range(facilities.map((facility) => facility.longitude)),
    },
    missingDetailLocation: facilities.filter(
      (facility) => facility.detailLocation === undefined,
    ).length,
    sourceUnknownSubtypeCodes: counts.sourceUnknownSubtypeCodes,
    baselineMatches,
  };
}

export function assertFireWaterAudit(audit: FireWaterAudit): void {
  if (audit.publishedRows === 0) {
    throw new Error("Refusing to publish empty fire water dataset");
  }

  if (
    audit.missing.id > 0 ||
    audit.missing.address > 0 ||
    audit.missing.coordinate > 0
  ) {
    throw new Error("Published fire water data has missing required fields");
  }

  if (audit.duplicate.sourceId.length > 0 || audit.duplicate.id.length > 0) {
    throw new Error("Published fire water data has duplicate identifiers");
  }
}

export function printFireWaterAudit(audit: FireWaterAudit): void {
  console.log("Fire Water ETL\n");
  console.log(`Source rows: ${audit.sourceRows.toLocaleString("en-US")}`);
  console.log(`Yangcheon rows: ${audit.yangcheonRows.toLocaleString("en-US")}`);
  console.log(`Sinwol rows: ${audit.sinwolRows.toLocaleString("en-US")}`);
  console.log(`Published rows: ${audit.publishedRows.toLocaleString("en-US")}\n`);
  console.log("Subtype:");

  for (const subtype of FIRE_WATER_SUBTYPES) {
    console.log(`- ${subtype}: ${audit.subtypeCounts[subtype]}`);
  }

  console.log("\nMissing required fields:");
  console.log(`- id: ${audit.missing.id}`);
  console.log(`- address: ${audit.missing.address}`);
  console.log(`- coordinate: ${audit.missing.coordinate}`);
  console.log("\nDuplicate:");
  console.log(`- sourceId: ${audit.duplicate.sourceId.length}`);
  console.log(`- id: ${audit.duplicate.id.length}`);
  console.log("\nCoordinate range:");
  console.log(
    `- latitude: ${audit.coordinateRange.latitude.min} ~ ${audit.coordinateRange.latitude.max}`,
  );
  console.log(
    `- longitude: ${audit.coordinateRange.longitude.min} ~ ${audit.coordinateRange.longitude.max}`,
  );
  console.log("\nNormalized missing detailLocation:");
  console.log(`- count: ${audit.missingDetailLocation}`);
  console.log(
    `\nCurrent snapshot baseline: ${audit.baselineMatches ? "MATCH" : "DIFF"}`,
  );

  if (audit.sourceUnknownSubtypeCodes.length > 0) {
    console.warn(
      `\nWarning: source rows outside Sinwol contain unknown subtype codes: ${audit.sourceUnknownSubtypeCodes.join(", ")}`,
    );
  }
}
