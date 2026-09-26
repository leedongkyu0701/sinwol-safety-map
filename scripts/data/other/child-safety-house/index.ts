import assert from "node:assert/strict";

import {
  childSafetyHouseFacilitiesSchema,
  otherFacilitiesSchema,
} from "../../../../src/shared/schemas/facility";
import {
  assertReasonableRecordCount,
  assertUniqueValues,
} from "../../../../src/shared/lib/validation";
import { readMetadataIfExists, updateOtherDatasetMetadata } from "../../shared/metadata";
import {
  hasSameJsonContent,
  readJsonFileIfExists,
  writeJsonIfChanged,
} from "../../shared/write-json";
import { mergeOtherFacilitiesByIdPrefix } from "../shared/merge";
import {
  assertChildSafetyHouseAudit,
  createChildSafetyHouseAudit,
  printChildSafetyHouseAudit,
} from "./audit";
import {
  CHILD_SAFETY_HOUSE_ID_PREFIX,
  CHILD_SAFETY_HOUSE_MAX_COUNT_DECREASE_RATIO,
  CHILD_SAFETY_HOUSE_METADATA_KEY,
  CHILD_SAFETY_HOUSE_METADATA_PATH,
  CHILD_SAFETY_HOUSE_OUTPUT_PATH,
  CHILD_SAFETY_HOUSE_SOURCE_NAME,
} from "./constants";
import { fetchChildSafetyHouseSource } from "./fetch";
import { readChildSafetyHouseReference } from "./reference";
import {
  assertChildSafetyHouseReview,
  findReviewedDuplicateExclusionSourceIds,
  transformChildSafetyHouseRows,
} from "./transform";

async function run(): Promise<void> {
  const existingOther = otherFacilitiesSchema.parse(
    readJsonFileIfExists(CHILD_SAFETY_HOUSE_OUTPUT_PATH) ?? [],
  );
  const existingMetadata = readMetadataIfExists(CHILD_SAFETY_HOUSE_METADATA_PATH);
  const reference = readChildSafetyHouseReference();
  const fetched = await fetchChildSafetyHouseSource();
  const transformed = transformChildSafetyHouseRows(fetched.rows, reference);
  const audit = createChildSafetyHouseAudit(
    fetched.totalCount,
    fetched.pagesFetched,
    fetched.rows,
    transformed,
    existingOther.filter(
      (facility) => !facility.id.startsWith(CHILD_SAFETY_HOUSE_ID_PREFIX),
    ).length + transformed.facilities.length,
  );
  printChildSafetyHouseAudit(audit);
  assertChildSafetyHouseReview(transformed);
  assertChildSafetyHouseAudit(audit);

  const facilities = childSafetyHouseFacilitiesSchema.parse(transformed.facilities);
  const merged = otherFacilitiesSchema.parse(
    mergeOtherFacilitiesByIdPrefix(existingOther, facilities, CHILD_SAFETY_HOUSE_ID_PREFIX),
  );

  assertUniqueValues(merged.map((facility) => facility.id), "OTHER facility id");
  assertUniqueValues(facilities.map((facility) => facility.sourceId), "child safety house sourceId");
  assert(facilities.every((facility) => facility.category === "OTHER" && facility.subtype === "CHILD_SAFETY_HOUSE"));
  assert(facilities.every((facility) => facility.id.startsWith(CHILD_SAFETY_HOUSE_ID_PREFIX)));

  const dataChanged = !hasSameJsonContent(CHILD_SAFETY_HOUSE_OUTPUT_PATH, merged);
  const existingChildFacilities = existingOther.filter((facility) =>
    facility.id.startsWith(CHILD_SAFETY_HOUSE_ID_PREFIX),
  );
  const childDataChanged =
    JSON.stringify(existingChildFacilities) !== JSON.stringify(facilities);
  const previousDataset = existingMetadata?.sources.other.datasets?.[CHILD_SAFETY_HOUSE_METADATA_KEY];
  const reviewedDuplicateExclusions = findReviewedDuplicateExclusionSourceIds(
    reference,
    new Set(existingChildFacilities.map((facility) => facility.sourceId)),
  );
  const previousCountForGuard =
    previousDataset?.count === existingChildFacilities.length
      ? previousDataset.count - reviewedDuplicateExclusions.length
      : previousDataset?.count;
  console.log(
    `Reviewed duplicate exclusions from previous snapshot: ${reviewedDuplicateExclusions.length}`,
  );
  assertReasonableRecordCount({
    label: "child safety house",
    nextCount: facilities.length,
    previousCount: previousCountForGuard,
    maxDecreaseRatio: CHILD_SAFETY_HOUSE_MAX_COUNT_DECREASE_RATIO,
  });
  const canReuseFetchedAt =
    !childDataChanged && previousDataset?.count === facilities.length &&
    previousDataset.source === CHILD_SAFETY_HOUSE_SOURCE_NAME &&
    previousDataset.fetchedAt !== undefined;
  const metadata = updateOtherDatasetMetadata(
    existingMetadata,
    CHILD_SAFETY_HOUSE_METADATA_KEY,
    {
      count: facilities.length,
      source: CHILD_SAFETY_HOUSE_SOURCE_NAME,
      fetchedAt: canReuseFetchedAt ? previousDataset.fetchedAt : fetched.fetchedAt,
    },
    { totalCount: merged.length, publishedDataChanged: dataChanged },
  );
  assert.equal(metadata.sources.other.count, merged.length);
  assert.equal(
    Object.values(metadata.sources.other.datasets ?? {}).reduce((sum, dataset) => sum + dataset.count, 0),
    merged.length,
  );

  const dataWritten = writeJsonIfChanged(CHILD_SAFETY_HOUSE_OUTPUT_PATH, merged);
  const metadataWritten = writeJsonIfChanged(CHILD_SAFETY_HOUSE_METADATA_PATH, metadata);
  console.log(`\nOutput: ${CHILD_SAFETY_HOUSE_OUTPUT_PATH} ${dataWritten ? "updated" : "unchanged"}`);
  console.log(`Output: ${CHILD_SAFETY_HOUSE_METADATA_PATH} ${metadataWritten ? "updated" : "unchanged"}`);
}

run().catch((error: unknown) => {
  console.error("Child safety house ETL failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
