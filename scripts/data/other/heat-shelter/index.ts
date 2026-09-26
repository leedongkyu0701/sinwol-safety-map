import {
  heatShelterFacilitiesSchema,
  otherFacilitiesSchema,
} from "../../../../src/shared/schemas/facility";
import {
  assertReasonableRecordCount,
  assertUniqueValues,
} from "../../../../src/shared/lib/validation";
import {
  readMetadataIfExists,
  updateOtherDatasetMetadata,
} from "../../shared/metadata";
import {
  hasSameJsonContent,
  readJsonFileIfExists,
  writeJsonIfChanged,
} from "../../shared/write-json";
import { mergeOtherFacilitiesByIdPrefix } from "../shared/merge";
import {
  assertHeatShelterAudit,
  auditHeatShelterFacilities,
  printHeatShelterAudit,
} from "./audit";
import {
  HEAT_SHELTER_ID_PREFIX,
  HEAT_SHELTER_MAX_COUNT_DECREASE_RATIO,
  HEAT_SHELTER_METADATA_KEY,
  HEAT_SHELTER_SOURCE_NAME,
  METADATA_OUTPUT_PATH,
  OTHER_OUTPUT_PATH,
} from "./constants";
import { fetchHeatShelterSource } from "./fetch";
import { transformHeatShelterRows } from "./transform";

async function run(): Promise<void> {
  const existingOtherRaw = readJsonFileIfExists(OTHER_OUTPUT_PATH) ?? [];
  const existingOther = otherFacilitiesSchema.parse(existingOtherRaw);
  const existingMetadata = readMetadataIfExists(METADATA_OUTPUT_PATH);
  const fetched = await fetchHeatShelterSource();
  const transformed = transformHeatShelterRows(fetched.rows);
  const transformedFacilities = transformed.facilities;
  assertUniqueValues(
    transformedFacilities.map((facility) => facility.sourceId),
    "heat shelter sourceId",
  );

  const mergedFacilities = otherFacilitiesSchema.parse(
    mergeOtherFacilitiesByIdPrefix(
      existingOther,
      transformedFacilities,
      HEAT_SHELTER_ID_PREFIX,
    ),
  );
  assertUniqueValues(
    mergedFacilities.map((facility) => facility.id),
    "OTHER facility id",
  );

  const audit = auditHeatShelterFacilities(
    fetched.totalCount,
    fetched.pagesFetched,
    transformed,
    transformedFacilities,
    mergedFacilities.length,
  );
  printHeatShelterAudit(audit);
  assertHeatShelterAudit(audit);

  const heatShelters = heatShelterFacilitiesSchema.parse(transformedFacilities);
  const previousHeatShelterCount =
    existingMetadata?.sources.other.datasets?.[HEAT_SHELTER_METADATA_KEY]?.count;
  assertReasonableRecordCount({
    label: "heat shelter",
    previousCount: previousHeatShelterCount,
    nextCount: heatShelters.length,
    maxDecreaseRatio: HEAT_SHELTER_MAX_COUNT_DECREASE_RATIO,
  });

  const dataChanged = !hasSameJsonContent(OTHER_OUTPUT_PATH, mergedFacilities);
  const existingHeatShelters = existingOther.filter((facility) =>
    facility.id.startsWith(HEAT_SHELTER_ID_PREFIX),
  );
  const heatShelterDataChanged =
    JSON.stringify(existingHeatShelters) !== JSON.stringify(heatShelters);
  const previousHeatShelterMetadata =
    existingMetadata?.sources.other.datasets?.[HEAT_SHELTER_METADATA_KEY];
  const canReuseFetchedAt =
    !heatShelterDataChanged &&
    previousHeatShelterMetadata?.count === heatShelters.length &&
    previousHeatShelterMetadata.source === HEAT_SHELTER_SOURCE_NAME &&
    previousHeatShelterMetadata.fetchedAt !== undefined;
  const fetchedAt = canReuseFetchedAt
    ? previousHeatShelterMetadata.fetchedAt
    : fetched.fetchedAt;
  const metadata = updateOtherDatasetMetadata(
    existingMetadata,
    HEAT_SHELTER_METADATA_KEY,
    {
      count: heatShelters.length,
      source: HEAT_SHELTER_SOURCE_NAME,
      fetchedAt,
    },
    {
      totalCount: mergedFacilities.length,
      publishedDataChanged: dataChanged,
    },
  );

  if (metadata.sources.other.count !== mergedFacilities.length) {
    throw new Error("OTHER metadata count does not match the published dataset");
  }

  const otherWritten = writeJsonIfChanged(OTHER_OUTPUT_PATH, mergedFacilities);
  const metadataWritten = writeJsonIfChanged(METADATA_OUTPUT_PATH, metadata);
  console.log("\nOutput:");
  console.log(`- ${OTHER_OUTPUT_PATH}: ${otherWritten ? "updated" : "unchanged"}`);
  console.log(`- ${METADATA_OUTPUT_PATH}: ${metadataWritten ? "updated" : "unchanged"}`);
}

run().catch((error: unknown) => {
  console.error("Heat shelter ETL failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
