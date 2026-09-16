import { fireWaterFacilitiesSchema } from "../../../src/shared/schemas/facility";
import {
  assertReasonableRecordCount,
  assertUniqueValues,
} from "../../../src/shared/lib/validation";
import {
  auditFireWaterFacilities,
  assertFireWaterAudit,
  printFireWaterAudit,
} from "../shared/audit";
import { calculateFileSha256 } from "../shared/file-hash";
import {
  readMetadataIfExists,
  updateSourceMetadata,
} from "../shared/metadata";
import {
  hasSameJsonContent,
  readJsonArrayCountIfExists,
  writeJsonIfChanged,
} from "../shared/write-json";
import {
  FIRE_WATER_INPUT_PATH,
  FIRE_WATER_MAX_COUNT_DECREASE_RATIO,
  FIRE_WATER_OUTPUT_PATH,
  FIRE_WATER_SOURCE_NAME,
  METADATA_OUTPUT_PATH,
} from "./constants";
import { parseFireWaterWorkbook } from "./parse";
import { transformFireWaterRows } from "./transform";

function run(): void {
  const previousPublishedCount = readJsonArrayCountIfExists(
    FIRE_WATER_OUTPUT_PATH,
  );
  const existingMetadata = readMetadataIfExists(METADATA_OUTPUT_PATH);
  const parsed = parseFireWaterWorkbook(FIRE_WATER_INPUT_PATH);
  const transformed = transformFireWaterRows(parsed.rows);
  const facilities = fireWaterFacilitiesSchema.parse(transformed.facilities);

  assertReasonableRecordCount({
    label: "fire water",
    previousCount: previousPublishedCount,
    nextCount: facilities.length,
    maxDecreaseRatio: FIRE_WATER_MAX_COUNT_DECREASE_RATIO,
  });

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
    sourceUnknownSubtypeCodes: transformed.sourceUnknownSubtypeCodes,
  });

  assertFireWaterAudit(audit);
  printFireWaterAudit(audit);

  const dataChanged = !hasSameJsonContent(FIRE_WATER_OUTPUT_PATH, facilities);
  const sourceFileSha256 = calculateFileSha256(FIRE_WATER_INPUT_PATH);
  const metadata = updateSourceMetadata(
    existingMetadata,
    "fireWater",
    {
      count: facilities.length,
      source: FIRE_WATER_SOURCE_NAME,
      sourceUpdatedAt: transformed.sourceUpdatedAt,
      sourceFileSha256,
    },
    { publishedDataChanged: dataChanged },
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
