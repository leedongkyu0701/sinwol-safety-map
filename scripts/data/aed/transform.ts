import {
  normalizeOptionalString,
  normalizeRequiredString,
  parseRequiredNumber,
} from "../../../src/shared/lib/normalize";
import {
  assertSeoulCoordinate,
  assertUniqueValues,
  createNamespacedId,
} from "../../../src/shared/lib/validation";
import { aedFacilitySchema } from "../../../src/shared/schemas/facility";
import type { AedFacility } from "../../../src/shared/types/facility";
import { AED_SOURCE_NAME } from "./constants";
import {
  createDecisionMap,
  findStaleReviewDecisions,
  resolveMobilityDecision,
  type AedMobilityDecision,
  type AedMobilityRegistry,
} from "./mobility";
import {
  createEmptyOperatingHoursAudit,
  mergeOperatingHoursAudit,
  normalizeAedOperatingHours,
  type AedOperatingHoursAudit,
} from "./operating-hours";
import type { AedSourceRow } from "./schema";

export interface AedReviewCandidate {
  sourceId: string;
  org: string;
  buildPlace?: string;
  address: string;
  candidateReasons: string[];
}

export interface AedTransformResult {
  facilities: AedFacility[];
  sinwolRows: number;
  detectedCandidates: number;
  reviewedFixed: number;
  reviewedMobile: number;
  mobileRows: number;
  unresolvedCandidates: AedReviewCandidate[];
  staleDecisions: AedMobilityDecision[];
  operatingHoursAudit: AedOperatingHoursAudit;
}

function compareSourceId(
  left: { sourceId: string },
  right: { sourceId: string },
): number {
  return left.sourceId.localeCompare(right.sourceId, "en");
}

function isSinwolRow(row: AedSourceRow): boolean {
  return (
    normalizeOptionalString(row.buildAddress)?.includes("신월동") === true
  );
}

export function transformAedRows(
  rows: readonly AedSourceRow[],
  registry: AedMobilityRegistry,
): AedTransformResult {
  const allSourceIds = rows.map((row, index) =>
    normalizeRequiredString(row.serialSeq, `AED source row ${index + 1} serialSeq`),
  );

  assertUniqueValues(allSourceIds, "AED source serialSeq");

  const sinwolRows = rows.filter(isSinwolRow);
  const currentSourceIds = new Set(
    sinwolRows.map((row, index) =>
      normalizeRequiredString(
        row.serialSeq,
        `Sinwol AED row ${index + 1} serialSeq`,
      ),
    ),
  );
  const decisionMap = createDecisionMap(registry);
  const facilities: AedFacility[] = [];
  const unresolvedCandidates: AedReviewCandidate[] = [];
  const operatingHoursAudit = createEmptyOperatingHoursAudit();
  let detectedCandidates = 0;
  let reviewedFixed = 0;
  let reviewedMobile = 0;
  let mobileRows = 0;

  for (const [index, row] of sinwolRows.entries()) {
    const rowLabel = `Sinwol AED row ${index + 1}`;
    const sourceId = normalizeRequiredString(
      row.serialSeq,
      `${rowLabel} serialSeq`,
    );
    const name = normalizeRequiredString(row.org, `${rowLabel} org`);
    const address = normalizeRequiredString(
      row.buildAddress,
      `${rowLabel} buildAddress`,
    );
    const detailLocation = normalizeOptionalString(row.buildPlace);
    const latitude = parseRequiredNumber(row.wgs84Lat, `${rowLabel} wgs84Lat`);
    const longitude = parseRequiredNumber(
      row.wgs84Lon,
      `${rowLabel} wgs84Lon`,
    );

    assertSeoulCoordinate(latitude, longitude);

    const normalizedHours = normalizeAedOperatingHours(row, rowLabel);
    mergeOperatingHoursAudit(operatingHoursAudit, normalizedHours.audit);

    const resolution = resolveMobilityDecision(
      {
        sourceId,
        org: name,
        ...(detailLocation === undefined ? {} : { buildPlace: detailLocation }),
        buildAddress: address,
      },
      decisionMap.get(sourceId),
    );

    if (resolution.isCandidate) {
      detectedCandidates += 1;
    }

    if (resolution.reviewed && resolution.mobility === "FIXED") {
      reviewedFixed += 1;
    }

    if (resolution.reviewed && resolution.mobility === "MOBILE") {
      reviewedMobile += 1;
    }

    if (resolution.mobility === undefined) {
      unresolvedCandidates.push({
        sourceId,
        org: name,
        ...(detailLocation === undefined ? {} : { buildPlace: detailLocation }),
        address,
        candidateReasons: resolution.reasons,
      });
      continue;
    }

    if (resolution.mobility === "MOBILE") {
      mobileRows += 1;
      continue;
    }

    const phone = normalizeOptionalString(row.clerkTel);
    const manufacturer = normalizeOptionalString(row.mfg);
    const model = normalizeOptionalString(row.model);

    facilities.push(
      aedFacilitySchema.parse({
        id: createNamespacedId("aed", sourceId),
        category: "AED",
        subtype: "AED",
        name,
        latitude,
        longitude,
        address,
        ...(detailLocation === undefined ? {} : { detailLocation }),
        source: AED_SOURCE_NAME,
        sourceId,
        details: {
          ...(phone === undefined ? {} : { phone }),
          ...(manufacturer === undefined ? {} : { manufacturer }),
          ...(model === undefined ? {} : { model }),
          mobility: "FIXED",
          ...(normalizedHours.operatingHours === undefined
            ? {}
            : { operatingHours: normalizedHours.operatingHours }),
        },
      }),
    );
  }

  facilities.sort(compareSourceId);
  unresolvedCandidates.sort(compareSourceId);

  return {
    facilities,
    sinwolRows: sinwolRows.length,
    detectedCandidates,
    reviewedFixed,
    reviewedMobile,
    mobileRows,
    unresolvedCandidates,
    staleDecisions: findStaleReviewDecisions(registry, currentSourceIds).sort(
      compareSourceId,
    ),
    operatingHoursAudit,
  };
}
