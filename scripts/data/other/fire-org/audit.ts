import {
  FIRE_ORGANIZATION_SUBTYPES,
  type FireOrganizationSubtype,
} from "../../../../src/shared/types/facility";
import {
  CURRENT_FIRE_ORG_SNAPSHOT_BASELINE,
  FIRE_ORG_SOURCE_CRS,
  FIRE_ORG_SOURCE_CRS_NAME,
} from "./constants";
import type { FireOrgTransformResult } from "./transform";

export interface FireOrgAudit {
  sourceRows: number;
  pagesFetched: number;
  selectedRows: number;
  missingRegistryIds: string[];
  duplicateSourceIds: string[];
  subtypeCounts: Record<FireOrganizationSubtype, number>;
  coordinateRange: {
    latitude: { min: number; max: number };
    longitude: { min: number; max: number };
  };
  publishedFireOrgRows: number;
  totalOtherRows: number;
  baselineMatches: boolean;
}

export function auditFireOrgFacilities(
  sourceRows: number,
  pagesFetched: number,
  transformed: FireOrgTransformResult,
  totalOtherRows: number,
): FireOrgAudit {
  const latitudes = transformed.facilities.map((facility) => facility.latitude);
  const longitudes = transformed.facilities.map(
    (facility) => facility.longitude,
  );

  if (latitudes.length === 0 || longitudes.length === 0) {
    throw new Error("Refusing to publish empty fire organization dataset");
  }

  return {
    sourceRows,
    pagesFetched,
    selectedRows: transformed.selectedRows,
    missingRegistryIds: transformed.missingRegistryIds,
    duplicateSourceIds: transformed.duplicateSourceIds,
    subtypeCounts: transformed.subtypeCounts,
    coordinateRange: {
      latitude: { min: Math.min(...latitudes), max: Math.max(...latitudes) },
      longitude: {
        min: Math.min(...longitudes),
        max: Math.max(...longitudes),
      },
    },
    publishedFireOrgRows: transformed.facilities.length,
    totalOtherRows,
    baselineMatches:
      sourceRows === CURRENT_FIRE_ORG_SNAPSHOT_BASELINE.sourceRows &&
      transformed.selectedRows ===
        CURRENT_FIRE_ORG_SNAPSHOT_BASELINE.selectedRows,
  };
}

export function assertFireOrgAudit(audit: FireOrgAudit): void {
  if (audit.publishedFireOrgRows === 0) {
    throw new Error("Refusing to publish empty fire organization dataset");
  }

  if (audit.missingRegistryIds.length > 0) {
    throw new Error("Fire organization registry contains missing source IDs");
  }

  if (audit.duplicateSourceIds.length > 0) {
    throw new Error("Fire organization source contains duplicate DEPT_id values");
  }
}

export function printFireOrgAudit(audit: FireOrgAudit): void {
  console.log("Fire Organization ETL\n");
  console.log(`API total rows: ${audit.sourceRows.toLocaleString("en-US")}`);
  console.log(`Pages fetched: ${audit.pagesFetched}`);
  console.log(`Selected registry rows: ${audit.selectedRows}`);
  console.log(`Missing registry IDs: ${audit.missingRegistryIds.length}`);
  console.log(`Duplicate DEPT_id: ${audit.duplicateSourceIds.length}`);
  console.log("\nSubtype:");

  for (const subtype of FIRE_ORGANIZATION_SUBTYPES) {
    console.log(`- ${subtype}: ${audit.subtypeCounts[subtype]}`);
  }

  console.log("\nCoordinate:");
  console.log(`- source CRS: ${FIRE_ORG_SOURCE_CRS} (${FIRE_ORG_SOURCE_CRS_NAME})`);
  console.log(
    `- latitude: ${audit.coordinateRange.latitude.min} ~ ${audit.coordinateRange.latitude.max}`,
  );
  console.log(
    `- longitude: ${audit.coordinateRange.longitude.min} ~ ${audit.coordinateRange.longitude.max}`,
  );
  console.log(`\nPublished fire-org rows: ${audit.publishedFireOrgRows}`);
  console.log(`Total OTHER rows: ${audit.totalOtherRows}`);
  console.log(
    `Current snapshot baseline: ${audit.baselineMatches ? "MATCH" : "DIFF"}`,
  );
}
