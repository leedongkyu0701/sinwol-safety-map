import { aedFacilitiesSchema } from "../../../src/shared/schemas/facility";
import {
  assertReasonableRecordCount,
  assertUniqueValues,
} from "../../../src/shared/lib/validation";
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
  assertAedAudit,
  auditAedFacilities,
  printAedAudit,
  printMobilityReview,
} from "./audit";
import {
  AED_CANDIDATE_OUTPUT_PATH,
  AED_MAX_COUNT_DECREASE_RATIO,
  AED_OUTPUT_PATH,
  AED_SOURCE_NAME,
  METADATA_OUTPUT_PATH,
} from "./constants";
import { fetchAedSource } from "./fetch";
import { readAedMobilityRegistry } from "./mobility";
import { transformAedRows } from "./transform";

async function run(): Promise<void> {
  const previousPublishedCount = readJsonArrayCountIfExists(AED_OUTPUT_PATH);
  const existingMetadata = readMetadataIfExists(METADATA_OUTPUT_PATH);
  const registry = readAedMobilityRegistry();
  const fetched = await fetchAedSource();
  const transformed = transformAedRows(fetched.rows, registry);
  const audit = auditAedFacilities(
    transformed.facilities,
    fetched.totalCount,
    fetched.pagesFetched,
    transformed,
  );

  printAedAudit(audit);

  writeJsonIfChanged(AED_CANDIDATE_OUTPUT_PATH, {
    schemaVersion: 1,
    candidates: transformed.unresolvedCandidates,
  });

  if (transformed.unresolvedCandidates.length > 0) {
    printMobilityReview(transformed.unresolvedCandidates);
  }

  assertAedAudit(audit);

  const facilities = aedFacilitiesSchema.parse(transformed.facilities);

  assertReasonableRecordCount({
    label: "AED",
    previousCount: previousPublishedCount,
    nextCount: facilities.length,
    maxDecreaseRatio: AED_MAX_COUNT_DECREASE_RATIO,
  });
  assertUniqueValues(
    facilities.map((facility) => facility.sourceId),
    "AED sourceId",
  );
  assertUniqueValues(
    facilities.map((facility) => facility.id),
    "AED facility id",
  );

  const dataChanged = !hasSameJsonContent(AED_OUTPUT_PATH, facilities);
  const previousAedMetadata = existingMetadata?.sources.aed;
  const canReuseFetchedAt =
    !dataChanged &&
    previousAedMetadata?.count === facilities.length &&
    previousAedMetadata.source === AED_SOURCE_NAME &&
    previousAedMetadata.fetchedAt !== undefined;
  const fetchedAt = canReuseFetchedAt
    ? previousAedMetadata.fetchedAt
    : fetched.fetchedAt;
  const metadata = updateSourceMetadata(
    existingMetadata,
    "aed",
    {
      count: facilities.length,
      source: AED_SOURCE_NAME,
      fetchedAt,
    },
    { publishedDataChanged: dataChanged },
  );
  const aedsWritten = writeJsonIfChanged(AED_OUTPUT_PATH, facilities);
  const metadataWritten = writeJsonIfChanged(METADATA_OUTPUT_PATH, metadata);

  console.log("\nOutput:");
  console.log(
    `- ${AED_OUTPUT_PATH}: ${aedsWritten ? "updated" : "unchanged"}`,
  );
  console.log(
    `- ${METADATA_OUTPUT_PATH}: ${metadataWritten ? "updated" : "unchanged"}`,
  );
}

run().catch((error: unknown) => {
  console.error("AED ETL failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
