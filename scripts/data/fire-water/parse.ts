import * as fs from "node:fs";

import * as XLSX from "xlsx";

import {
  FIRE_WATER_SHEET_NAME,
  SOURCE_HEADER_PREFIXES,
} from "./constants";

XLSX.set_fs(fs);

type SourceField = keyof typeof SOURCE_HEADER_PREFIXES;

export interface RawFireWaterRow {
  rowNumber: number;
  sourceId: unknown;
  typeCode: unknown;
  city: unknown;
  district: unknown;
  roadAddress: unknown;
  lotAddress: unknown;
  latitude: unknown;
  longitude: unknown;
  detailLocation: unknown;
  safetyCenter: unknown;
  installedYear: unknown;
  pressure: unknown;
  fireStation: unknown;
  phone: unknown;
  sourceUpdatedAt: unknown;
}

export interface ParsedFireWaterSource {
  sheetName: string;
  headers: string[];
  rows: RawFireWaterRow[];
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

function resolveHeaderIndexes(
  row: readonly unknown[],
): Record<SourceField, number> | undefined {
  const normalizedHeaders = row.map(normalizeHeader);
  const indexes = {} as Record<SourceField, number>;

  for (const [field, prefix] of Object.entries(SOURCE_HEADER_PREFIXES)) {
    const matchingIndexes = normalizedHeaders.flatMap((header, index) =>
      header.startsWith(prefix) ? [index] : [],
    );

    if (matchingIndexes.length !== 1) {
      return undefined;
    }

    indexes[field as SourceField] = matchingIndexes[0];
  }

  return indexes;
}

function isCompletelyEmptyRow(row: readonly unknown[]): boolean {
  return row.every(
    (value) => value === undefined || value === null || String(value).trim() === "",
  );
}

export function parseFireWaterWorkbook(inputPath: string): ParsedFireWaterSource {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Fire water source XLSX not found: ${inputPath}`);
  }

  const workbook = XLSX.readFile(inputPath, { raw: true });
  const worksheet = workbook.Sheets[FIRE_WATER_SHEET_NAME];

  if (worksheet === undefined) {
    throw new Error(
      `Fire water sheet not found: ${FIRE_WATER_SHEET_NAME}. Available sheets: ${workbook.SheetNames.join(", ")}`,
    );
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: undefined,
    blankrows: false,
  });

  let headerRowIndex = -1;
  let headerIndexes: Record<SourceField, number> | undefined;

  for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
    const resolved = resolveHeaderIndexes(matrix[index]);

    if (resolved !== undefined) {
      headerRowIndex = index;
      headerIndexes = resolved;
      break;
    }
  }

  if (headerIndexes === undefined) {
    throw new Error(
      `Required fire water headers were not found in sheet: ${FIRE_WATER_SHEET_NAME}`,
    );
  }

  const headers = matrix[headerRowIndex].map((value) => String(value ?? "").trim());
  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter((row) => !isCompletelyEmptyRow(row))
    .map((row, index): RawFireWaterRow => {
      const get = (field: SourceField): unknown => row[headerIndexes[field]];

      return {
        rowNumber: headerRowIndex + index + 2,
        sourceId: get("sourceId"),
        typeCode: get("typeCode"),
        city: get("city"),
        district: get("district"),
        roadAddress: get("roadAddress"),
        lotAddress: get("lotAddress"),
        latitude: get("latitude"),
        longitude: get("longitude"),
        detailLocation: get("detailLocation"),
        safetyCenter: get("safetyCenter"),
        installedYear: get("installedYear"),
        pressure: get("pressure"),
        fireStation: get("fireStation"),
        phone: get("phone"),
        sourceUpdatedAt: get("sourceUpdatedAt"),
      };
    });

  if (rows.length === 0) {
    throw new Error("Fire water source workbook contains no data rows");
  }

  return {
    sheetName: FIRE_WATER_SHEET_NAME,
    headers,
    rows,
  };
}
