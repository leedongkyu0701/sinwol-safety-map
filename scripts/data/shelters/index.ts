import {
  assertReasonableRecordCount,
  assertUniqueValues,
} from "../../../src/shared/lib/validation";
import { shelterFacilitiesSchema } from "../../../src/shared/schemas/facility";
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
  assertShelterAudit,
  auditShelterFacilities,
  printShelterAudit,
} from "./audit";
import {
  METADATA_OUTPUT_PATH,
  SHELTER_MAX_COUNT_DECREASE_RATIO,
  SHELTER_OUTPUT_PATH,
  SHELTER_SOURCE_NAME,
} from "./constants";
import { fetchShelterSource } from "./fetch";
import { transformShelterRows } from "./transform";

async function run(): Promise<void> {
  const previousPublishedCount = readJsonArrayCountIfExists(
    SHELTER_OUTPUT_PATH,
  );
  const existingMetadata = readMetadataIfExists(METADATA_OUTPUT_PATH);
  const fetched = await fetchShelterSource();
  const transformed = transformShelterRows(fetched.rows);
  const facilities = shelterFacilitiesSchema.parse(transformed.facilities);

  assertReasonableRecordCount({
    label: "shelter",
    previousCount: previousPublishedCount,
    nextCount: facilities.length,
    maxDecreaseRatio: SHELTER_MAX_COUNT_DECREASE_RATIO,
  });
  assertUniqueValues(
    facilities.map((facility) => facility.sourceId),
    "shelter sourceId",
  );
  assertUniqueValues(
    facilities.map((facility) => facility.id),
    "shelter facility id",
  );

  const audit = auditShelterFacilities(
    facilities,
    fetched.totalCount,
    transformed,
  );

  printShelterAudit(audit);
  assertShelterAudit(audit);

  const dataChanged = !hasSameJsonContent(SHELTER_OUTPUT_PATH, facilities);
  const previousShelterMetadata = existingMetadata?.sources.shelter;
  const canReuseFetchedAt =
    !dataChanged &&
    previousShelterMetadata?.count === facilities.length &&
    previousShelterMetadata.source === SHELTER_SOURCE_NAME &&
    previousShelterMetadata.fetchedAt !== undefined;
  const fetchedAt = canReuseFetchedAt
    ? previousShelterMetadata.fetchedAt
    : fetched.fetchedAt;
  const metadata = updateSourceMetadata(
    existingMetadata,
    "shelter",
    {
      count: facilities.length,
      source: SHELTER_SOURCE_NAME,
      fetchedAt,
    },
    { publishedDataChanged: dataChanged },
  );
  const sheltersWritten = writeJsonIfChanged(SHELTER_OUTPUT_PATH, facilities);
  const metadataWritten = writeJsonIfChanged(METADATA_OUTPUT_PATH, metadata);

  console.log("\nOutput:");
  console.log(
    `- ${SHELTER_OUTPUT_PATH}: ${sheltersWritten ? "updated" : "unchanged"}`,
  );
  console.log(
    `- ${METADATA_OUTPUT_PATH}: ${metadataWritten ? "updated" : "unchanged"}`,
  );
}

run().catch((error: unknown) => {
  console.error("Shelter ETL failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
