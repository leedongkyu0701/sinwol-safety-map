import {
  normalizeOptionalString,
  normalizeRequiredString,
  parseRequiredNumber,
} from "../../../src/shared/lib/normalize";
import {
  assertSeoulCoordinate,
  createNamespacedId,
} from "../../../src/shared/lib/validation";
import { shelterFacilitySchema } from "../../../src/shared/schemas/facility";
import type { ShelterFacility } from "../../../src/shared/types/facility";
import {
  SHELTER_ACTIVE_STATUS,
  SHELTER_INACTIVE_STATUS,
  SHELTER_KNOWN_STATUSES,
  SHELTER_SOURCE_NAME,
  SHELTER_SUBTYPE,
  YANGCHEON_ORGANIZATION_CODE,
} from "./constants";
import type { ShelterSourceRow } from "./schema";

export interface ShelterTransformResult {
  facilities: ShelterFacility[];
  yangcheonRows: number;
  sinwolRows: number;
  activeRows: number;
  inactiveRows: number;
  statusCounts: Record<string, number>;
  unknownStatuses: string[];
}

function isYangcheonRow(row: ShelterSourceRow): boolean {
  return (
    normalizeOptionalString(row.OGDP_INST_CD) === YANGCHEON_ORGANIZATION_CODE
  );
}

function isSinwolRow(row: ShelterSourceRow, rowNumber: number): boolean {
  const lotAddress = normalizeRequiredString(
    row.LOTNO_ADDR,
    `Shelter source row ${rowNumber} LOTNO_ADDR`,
  );

  return lotAddress.includes("신월동");
}

function transformRow(
  row: ShelterSourceRow,
  rowNumber: number,
): ShelterFacility {
  const sourceId = normalizeRequiredString(
    row.MNG_NO,
    `Shelter source row ${rowNumber} MNG_NO`,
  );
  const name = normalizeRequiredString(
    row.BPLC_NM,
    `Shelter source row ${rowNumber} BPLC_NM`,
  );
  const roadAddress = normalizeOptionalString(row.ROAD_NM_ADDR);
  const lotAddress = normalizeOptionalString(row.LOTNO_ADDR);
  const address = roadAddress ?? lotAddress;

  if (address === undefined) {
    throw new Error(`Shelter source row ${rowNumber} address is required`);
  }

  const latitude = parseRequiredNumber(
    row.XCRD,
    `Shelter source row ${rowNumber} XCRD`,
  );
  const longitude = parseRequiredNumber(
    row.YCRD,
    `Shelter source row ${rowNumber} YCRD`,
  );

  assertSeoulCoordinate(latitude, longitude);

  return shelterFacilitySchema.parse({
    id: createNamespacedId("shelter", sourceId),
    category: "SHELTER",
    subtype: SHELTER_SUBTYPE,
    name,
    latitude,
    longitude,
    address,
    ...(roadAddress === undefined ? {} : { roadAddress }),
    ...(lotAddress === undefined ? {} : { lotAddress }),
    source: SHELTER_SOURCE_NAME,
    sourceId,
    details: {
      status: SHELTER_ACTIVE_STATUS,
    },
  });
}

export function transformShelterRows(
  rows: readonly ShelterSourceRow[],
): ShelterTransformResult {
  const yangcheonRows = rows.filter(isYangcheonRow);
  const sinwolRows = yangcheonRows.filter((row, index) =>
    isSinwolRow(row, index + 1),
  );
  const statusCounts: Record<string, number> = {};

  for (const [index, row] of sinwolRows.entries()) {
    const status =
      normalizeOptionalString(row.SALS_STTS_NM) ?? `<missing:${index + 1}>`;
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  const knownStatuses = new Set<string>(SHELTER_KNOWN_STATUSES);
  const unknownStatuses = Object.keys(statusCounts)
    .filter((status) => !knownStatuses.has(status))
    .sort();
  const activeSourceRows = sinwolRows.filter(
    (row) => normalizeOptionalString(row.SALS_STTS_NM) === SHELTER_ACTIVE_STATUS,
  );
  const inactiveRows = sinwolRows.filter(
    (row) => normalizeOptionalString(row.SALS_STTS_NM) === SHELTER_INACTIVE_STATUS,
  ).length;
  const facilities = activeSourceRows
    .map((row, index) => transformRow(row, index + 1))
    .sort((left, right) =>
      left.sourceId < right.sourceId
        ? -1
        : left.sourceId > right.sourceId
          ? 1
          : 0,
    );

  return {
    facilities,
    yangcheonRows: yangcheonRows.length,
    sinwolRows: sinwolRows.length,
    activeRows: activeSourceRows.length,
    inactiveRows,
    statusCounts,
    unknownStatuses,
  };
}
