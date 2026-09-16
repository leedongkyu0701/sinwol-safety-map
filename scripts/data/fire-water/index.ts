import { fireWaterFacilitiesSchema } from "../../../src/shared/schemas/facility";
import {
  metadataSchema,
  type DataMetadata,
} from "../../../src/shared/schemas/metadata";
import {
  assertUniqueValues,
} from "../../../src/shared/lib/validation";
import {
  auditFireWaterFacilities,
  assertFireWaterAudit,
  printFireWaterAudit,
} from "../shared/audit";
import {
  hasSameJsonContent,
  readJsonFileIfExists,
  writeJsonIfChanged,
} from "../shared/write-json";
import {
  FIRE_WATER_INPUT_PATH,
  FIRE_WATER_OUTPUT_PATH,
  FIRE_WATER_SOURCE_NAME,
  METADATA_OUTPUT_PATH,
} from "./constants";
import { parseFireWaterWorkbook } from "./parse";
import { transformFireWaterRows } from "./transform";

function buildMetadata(
  count: number,
  sourceUpdatedAt: string,
  dataChanged: boolean,
): DataMetadata {
  const existingRaw = readJsonFileIfExists(METADATA_OUTPUT_PATH);
  const existing =
    existingRaw === undefined ? undefined : metadataSchema.parse(existingRaw);
  const generatedAt =
    !dataChanged && existing !== undefined
      ? existing.generatedAt
      : new Date().toISOString();

  return metadataSchema.parse({
    schemaVersion: 1,
    generatedAt,
    sources: {
      fireWater: {
        count,
        source: FIRE_WATER_SOURCE_NAME,
        sourceUpdatedAt,
      },
      shelter: { count: 0 },
      aed: { count: 0 },
      other: { count: 0 },
    },
  });
}

function run(): void {
  const parsed = parseFireWaterWorkbook(FIRE_WATER_INPUT_PATH);
  const transformed = transformFireWaterRows(parsed.rows);
  const facilities = fireWaterFacilitiesSchema.parse(transformed.facilities);

  assertUniqueValues(
    facilities.map((facility) => facility.sourceId),
    "sourceId",
  );
  assertUniqueValues(
    facilities.map((facility) => facility.id),
    "facility id",
  );

  const audit = auditFireWaterFacilities(facilities, {
    sourceRows: parsed.rows.length,
    yangcheonRows: transformed.yangcheonRows,
    sinwolRows: transformed.sinwolRows,
  });

  assertFireWaterAudit(audit);
  printFireWaterAudit(audit);

  const dataChanged = !hasSameJsonContent(FIRE_WATER_OUTPUT_PATH, facilities);
  const metadata = buildMetadata(
    facilities.length,
    transformed.sourceUpdatedAt,
    dataChanged,
  );
  const fireWaterWritten = writeJsonIfChanged(
    FIRE_WATER_OUTPUT_PATH,
    facilities,
  );
  const metadataWritten = writeJsonIfChanged(METADATA_OUTPUT_PATH, metadata);

  console.log("\nOutput:");
  console.log(
    `- ${FIRE_WATER_OUTPUT_PATH}: ${fireWaterWritten ? "updated" : "unchanged"}`,
  );
  console.log(
    `- ${METADATA_OUTPUT_PATH}: ${metadataWritten ? "updated" : "unchanged"}`,
  );
}

try {
  run();
} catch (error) {
  console.error("Fire water ETL failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
