import { findDuplicateValues } from "../../../src/shared/lib/validation";
import type { AedFacility } from "../../../src/shared/types/facility";
import { CURRENT_AED_SNAPSHOT_BASELINE } from "./constants";
import type { AedPendingCandidate } from "./mobility";
import type { AedTransformResult } from "./transform";

export interface DuplicateAedCoordinateGroup {
  latitude: number;
  longitude: number;
  facilities: Array<{ sourceId: string; name: string }>;
}

export interface AedAudit {
  apiRows: number;
  pagesFetched: number;
  sinwolRows: number;
  publishedRows: number;
  mobility: {
    detectedCandidates: number;
    autoFixed: number;
    reviewedFixed: number;
    reviewedMobile: number;
    pendingReview: number;
  };
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
  duplicateCoordinateGroups: DuplicateAedCoordinateGroup[];
  coordinateRange?: {
    latitude: { min: number; max: number };
    longitude: { min: number; max: number };
  };
  operatingHours: AedTransformResult["operatingHoursAudit"];
  privacy: {
    managerPublished: number;
    managerTelPublished: number;
  };
  staleDecisionSourceIds: string[];
  baselineMatches: boolean;
}

function findDuplicateCoordinateGroups(
  facilities: readonly AedFacility[],
): DuplicateAedCoordinateGroup[] {
  const groups = new Map<string, AedFacility[]>();

  for (const facility of facilities) {
    const key = `${facility.latitude},${facility.longitude}`;
    groups.set(key, [...(groups.get(key) ?? []), facility]);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
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

function countKey(value: unknown, target: string): number {
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + countKey(item, target), 0);
  }

  if (value === null || typeof value !== "object") {
    return 0;
  }

  return Object.entries(value).reduce(
    (count, [key, child]) =>
      count + (key === target ? 1 : 0) + countKey(child, target),
    0,
  );
}

export function auditAedFacilities(
  facilities: readonly AedFacility[],
  apiRows: number,
  pagesFetched: number,
  transformed: AedTransformResult,
): AedAudit {
  const latitudes = facilities.map((facility) => facility.latitude);
  const longitudes = facilities.map((facility) => facility.longitude);

  return {
    apiRows,
    pagesFetched,
    sinwolRows: transformed.sinwolRows,
    publishedRows: facilities.length,
    mobility: {
      detectedCandidates: transformed.detectedCandidates,
      autoFixed: transformed.autoFixed,
      reviewedFixed: transformed.reviewedFixed,
      reviewedMobile: transformed.reviewedMobile,
      pendingReview: transformed.pendingCandidates.length,
    },
    missing: {
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
    },
    duplicate: {
      sourceId: findDuplicateValues(
        facilities.map((facility) => facility.sourceId),
      ),
      id: findDuplicateValues(facilities.map((facility) => facility.id)),
    },
    duplicateCoordinateGroups: findDuplicateCoordinateGroups(facilities),
    ...(facilities.length === 0
      ? {}
      : {
          coordinateRange: {
            latitude: {
              min: Math.min(...latitudes),
              max: Math.max(...latitudes),
            },
            longitude: {
              min: Math.min(...longitudes),
              max: Math.max(...longitudes),
            },
          },
        }),
    operatingHours: transformed.operatingHoursAudit,
    privacy: {
      managerPublished: countKey(facilities, "manager"),
      managerTelPublished: countKey(facilities, "managerTel"),
    },
    staleDecisionSourceIds: transformed.staleDecisions.map(
      (decision) => decision.sourceId,
    ),
    baselineMatches:
      apiRows === CURRENT_AED_SNAPSHOT_BASELINE.apiRows &&
      transformed.sinwolRows === CURRENT_AED_SNAPSHOT_BASELINE.sinwolRows,
  };
}

export function assertAedAudit(audit: AedAudit): void {
  const classifiedRows =
    audit.mobility.autoFixed +
    audit.mobility.reviewedFixed +
    audit.mobility.reviewedMobile +
    audit.mobility.pendingReview;

  if (classifiedRows !== audit.sinwolRows) {
    throw new Error(
      `AED mobility counts do not match Sinwol rows: ${classifiedRows} of ${audit.sinwolRows}`,
    );
  }

  if (
    audit.publishedRows !==
    audit.mobility.autoFixed + audit.mobility.reviewedFixed
  ) {
    throw new Error(
      "Published AED count must equal AUTO FIXED plus REVIEWED FIXED",
    );
  }

  if (audit.publishedRows === 0) {
    throw new Error("Refusing to publish empty AED dataset");
  }

  if (Object.values(audit.missing).some((count) => count > 0)) {
    throw new Error("Published AED data has missing required fields");
  }

  if (audit.duplicate.sourceId.length > 0 || audit.duplicate.id.length > 0) {
    throw new Error("Published AED data has duplicate identifiers");
  }

  if (
    audit.privacy.managerPublished > 0 ||
    audit.privacy.managerTelPublished > 0
  ) {
    throw new Error("Published AED data contains forbidden manager fields");
  }
}

export function printPendingReviewWarning(
  candidates: readonly AedPendingCandidate[],
): void {
  if (candidates.length === 0) {
    return;
  }

  console.warn(
    `\nWarning: ${candidates.length} AED mobility candidate(s) require review.`,
  );
  console.warn("They were excluded from the published snapshot.\n");
  console.warn("sourceId | org | buildPlace | address | reasons");

  for (const candidate of candidates) {
    console.warn(
      [
        candidate.sourceId,
        candidate.org,
        candidate.buildPlace ?? "<missing>",
        candidate.address,
        candidate.reasons.join(", "),
      ].join(" | "),
    );
  }
}

export function printAedAudit(audit: AedAudit): void {
  console.log("AED ETL\n");
  console.log(`API rows: ${audit.apiRows.toLocaleString("en-US")}`);
  console.log(`Pages fetched: ${audit.pagesFetched}`);
  console.log(`Sinwol raw rows: ${audit.sinwolRows.toLocaleString("en-US")}`);
  console.log(`Published FIXED rows: ${audit.publishedRows.toLocaleString("en-US")}`);
  console.log("\nMobility:");
  console.log(`- detected candidates: ${audit.mobility.detectedCandidates}`);
  console.log(`- auto FIXED: ${audit.mobility.autoFixed}`);
  console.log(`- reviewed FIXED: ${audit.mobility.reviewedFixed}`);
  console.log(`- reviewed MOBILE: ${audit.mobility.reviewedMobile}`);
  console.log(`- pending review: ${audit.mobility.pendingReview}`);
  console.log(`- published FIXED: ${audit.publishedRows}`);
  console.log("\nMissing required fields:");
  console.log(`- sourceId: ${audit.missing.sourceId}`);
  console.log(`- name: ${audit.missing.name}`);
  console.log(`- address: ${audit.missing.address}`);
  console.log(`- coordinate: ${audit.missing.coordinate}`);
  console.log("\nDuplicate:");
  console.log(`- sourceId: ${audit.duplicate.sourceId.length}`);
  console.log(`- id: ${audit.duplicate.id.length}`);
  console.log(
    `- coordinate groups: ${audit.duplicateCoordinateGroups.length}`,
  );
  console.log("\nOperating Hours:");
  console.log(`- full-day ranges: ${audit.operatingHours.fullDayRanges}`);
  console.log(
    `- extended end-time ranges: ${audit.operatingHours.extendedEndTimeRanges}`,
  );
  console.log(`- missing day fields: ${audit.operatingHours.missingDayFields}`);
  console.log(`- incomplete ranges: ${audit.operatingHours.incompleteRanges}`);
  console.log(`- invalid ranges: ${audit.operatingHours.invalidRanges}`);
  console.log(
    `- value distribution: ${JSON.stringify(audit.operatingHours.timeValueCounts)}`,
  );

  if (audit.coordinateRange !== undefined) {
    console.log("\nCoordinate range:");
    console.log(
      `- latitude: ${audit.coordinateRange.latitude.min} ~ ${audit.coordinateRange.latitude.max}`,
    );
    console.log(
      `- longitude: ${audit.coordinateRange.longitude.min} ~ ${audit.coordinateRange.longitude.max}`,
    );
  }

  console.log("\nPrivacy:");
  console.log(`- manager Published: ${audit.privacy.managerPublished}`);
  console.log(`- managerTel Published: ${audit.privacy.managerTelPublished}`);
  console.log(
    `\nCurrent snapshot baseline: ${audit.baselineMatches ? "MATCH" : "DIFF"}`,
  );

  if (audit.staleDecisionSourceIds.length > 0) {
    console.warn(
      `\nWarning: stale AED mobility decisions: ${audit.staleDecisionSourceIds.join(", ")}`,
    );
  }
}
