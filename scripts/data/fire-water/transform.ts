import { fireWaterFacilitySchema } from "../../../src/shared/schemas/facility";
import type {
  FireWaterFacility,
  FireWaterSubtype,
} from "../../../src/shared/types/facility";
import { FIRE_WATER_SUBTYPE_LABELS } from "../../../src/shared/types/facility";
import {
  normalizeOptionalString,
  normalizeRequiredString,
  parseOptionalInteger,
  parseOptionalNumber,
  parseRequiredNumber,
} from "../../../src/shared/lib/normalize";
import {
  assertSeoulCoordinate,
  createNamespacedId,
} from "../../../src/shared/lib/validation";
import {
  FIRE_WATER_SOURCE_NAME,
  FIRE_WATER_SUBTYPE_BY_CODE,
  type FireWaterSourceCode,
} from "./constants";
import type { RawFireWaterRow } from "./parse";

export interface FireWaterTransformResult {
  facilities: FireWaterFacility[];
  yangcheonRows: number;
  sinwolRows: number;
  sourceUpdatedAt: string;
  sourceUnknownSubtypeCodes: string[];
}

function normalizeSourceCode(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value);

  if (normalized === undefined) {
    return undefined;
  }

  return /^\d$/.test(normalized) ? normalized.padStart(2, "0") : normalized;
}

export function mapFireWaterSubtype(value: unknown): FireWaterSubtype {
  const code = normalizeSourceCode(value);

  if (
    code === undefined ||
    !Object.hasOwn(FIRE_WATER_SUBTYPE_BY_CODE, code)
  ) {
    throw new Error(`Unknown fire water subtype code: ${code ?? "<missing>"}`);
  }

  return FIRE_WATER_SUBTYPE_BY_CODE[code as FireWaterSourceCode];
}

function findUnknownSubtypeCodes(rows: readonly RawFireWaterRow[]): string[] {
  const unknownCodes = new Set<string>();

  for (const row of rows) {
    try {
      mapFireWaterSubtype(row.typeCode);
    } catch {
      unknownCodes.add(normalizeSourceCode(row.typeCode) ?? "<missing>");
    }
  }

  return [...unknownCodes].sort();
}

function assertKnownSubtypeCodes(rows: readonly RawFireWaterRow[]): void {
  const unknownCodes = findUnknownSubtypeCodes(rows);

  if (unknownCodes.length > 0) {
    throw new Error(
      `Unknown fire water subtype codes found in Sinwol rows: ${unknownCodes.join(", ")}`,
    );
  }
}

function isYangcheonRow(row: RawFireWaterRow): boolean {
  return (
    normalizeOptionalString(row.city) === "서울특별시" &&
    normalizeOptionalString(row.district) === "양천구"
  );
}

function isSinwolRow(row: RawFireWaterRow): boolean {
  const lotAddress = normalizeRequiredString(
    row.lotAddress,
    `Row ${row.rowNumber} lotAddress`,
  );

  return lotAddress.includes("신월동");
}

function transformRow(row: RawFireWaterRow): FireWaterFacility {
  const sourceId = normalizeRequiredString(
    row.sourceId,
    `Row ${row.rowNumber} sourceId`,
  );
  const subtype = mapFireWaterSubtype(row.typeCode);
  const roadAddress = normalizeOptionalString(row.roadAddress);
  const lotAddress = normalizeOptionalString(row.lotAddress);
  const address = roadAddress ?? lotAddress;

  if (address === undefined) {
    throw new Error(`Row ${row.rowNumber} address is required`);
  }

  const latitude = parseRequiredNumber(
    row.latitude,
    `Row ${row.rowNumber} latitude`,
  );
  const longitude = parseRequiredNumber(
    row.longitude,
    `Row ${row.rowNumber} longitude`,
  );

  assertSeoulCoordinate(latitude, longitude);

  const installedYear = parseOptionalInteger(
    row.installedYear,
    `Row ${row.rowNumber} installedYear`,
  );
  const pressure = parseOptionalNumber(
    row.pressure,
    `Row ${row.rowNumber} pressure`,
  );
  const safetyCenter = normalizeOptionalString(row.safetyCenter);
  const fireStation = normalizeOptionalString(row.fireStation);
  const fireStationPhone = normalizeOptionalString(row.phone);
  const detailLocation = normalizeOptionalString(row.detailLocation);

  const facility: FireWaterFacility = {
    id: createNamespacedId("fire-water", sourceId),
    category: "FIRE_WATER",
    subtype,
    name: FIRE_WATER_SUBTYPE_LABELS[subtype],
    latitude,
    longitude,
    address,
    ...(roadAddress === undefined ? {} : { roadAddress }),
    ...(lotAddress === undefined ? {} : { lotAddress }),
    ...(detailLocation === undefined ? {} : { detailLocation }),
    source: FIRE_WATER_SOURCE_NAME,
    sourceId,
    details: {
      ...(installedYear === undefined ? {} : { installedYear }),
      ...(pressure === undefined ? {} : { pressure }),
      ...(safetyCenter === undefined ? {} : { safetyCenter }),
      ...(fireStation === undefined ? {} : { fireStation }),
      ...(fireStationPhone === undefined ? {} : { fireStationPhone }),
    },
  };

  return fireWaterFacilitySchema.parse(facility);
}

export function transformFireWaterRows(
  rows: readonly RawFireWaterRow[],
): FireWaterTransformResult {
  const sourceUnknownSubtypeCodes = findUnknownSubtypeCodes(rows);
  const yangcheonRows = rows.filter(isYangcheonRow);
  const sinwolRows = yangcheonRows.filter(isSinwolRow);

  if (sinwolRows.length === 0) {
    throw new Error("Refusing to publish empty fire water dataset");
  }

  assertKnownSubtypeCodes(sinwolRows);

  const sourceDates = new Set(
    sinwolRows.map((row) =>
      normalizeRequiredString(
        row.sourceUpdatedAt,
        `Row ${row.rowNumber} sourceUpdatedAt`,
      ),
    ),
  );

  if (sourceDates.size !== 1) {
    throw new Error(
      `Expected one sourceUpdatedAt value for Sinwol rows, found: ${[
        ...sourceDates,
      ].join(", ")}`,
    );
  }

  const facilities = sinwolRows
    .map(transformRow)
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
    sourceUpdatedAt: [...sourceDates][0],
    sourceUnknownSubtypeCodes,
  };
}
