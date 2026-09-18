import {
  fireOrganizationFacilitiesSchema,
  otherFacilitiesSchema,
} from "../../../../src/shared/schemas/facility";
import { assertUniqueValues } from "../../../../src/shared/lib/validation";
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
  assertFireOrgAudit,
  auditFireOrgFacilities,
  printFireOrgAudit,
} from "./audit";
import {
  FIRE_ORG_ID_PREFIX,
  FIRE_ORG_METADATA_KEY,
  FIRE_ORG_SOURCE_NAME,
  METADATA_OUTPUT_PATH,
  OTHER_OUTPUT_PATH,
} from "./constants";
import { fetchFireOrgSource } from "./fetch";
import { readFireOrgReference } from "./reference";
import { transformFireOrgRows } from "./transform";

async function run(): Promise<void> {
  const existingOtherRaw = readJsonFileIfExists(OTHER_OUTPUT_PATH) ?? [];
  const existingOther = otherFacilitiesSchema.parse(existingOtherRaw);
  const existingMetadata = readMetadataIfExists(METADATA_OUTPUT_PATH);
  const reference = readFireOrgReference();
  const fetched = await fetchFireOrgSource();
  const transformed = transformFireOrgRows(fetched.rows, reference);
  const fireOrgFacilities = fireOrganizationFacilitiesSchema.parse(
    transformed.facilities,
  );
  const mergedFacilities = otherFacilitiesSchema.parse(
    mergeOtherFacilitiesByIdPrefix(
      existingOther,
      fireOrgFacilities,
      FIRE_ORG_ID_PREFIX,
    ),
  );

  assertUniqueValues(
    mergedFacilities.map((facility) => facility.id),
    "OTHER facility id",
  );
  assertUniqueValues(
    fireOrgFacilities.map((facility) => facility.sourceId),
    "fire organization sourceId",
  );

  const audit = auditFireOrgFacilities(
    fetched.totalCount,
    fetched.pagesFetched,
    transformed,
    mergedFacilities.length,
  );

  printFireOrgAudit(audit);
  assertFireOrgAudit(audit);

  const dataChanged = !hasSameJsonContent(OTHER_OUTPUT_PATH, mergedFacilities);
  const previousFireOrgMetadata =
    existingMetadata?.sources.other.datasets?.[FIRE_ORG_METADATA_KEY];
  const canReuseFetchedAt =
    !dataChanged &&
    previousFireOrgMetadata?.count === fireOrgFacilities.length &&
    previousFireOrgMetadata.source === FIRE_ORG_SOURCE_NAME &&
    previousFireOrgMetadata.fetchedAt !== undefined;
  const fetchedAt = canReuseFetchedAt
    ? previousFireOrgMetadata.fetchedAt
    : fetched.fetchedAt;
  const metadata = updateOtherDatasetMetadata(
    existingMetadata,
    FIRE_ORG_METADATA_KEY,
    {
      count: fireOrgFacilities.length,
      source: FIRE_ORG_SOURCE_NAME,
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
  console.log(
    `- ${OTHER_OUTPUT_PATH}: ${otherWritten ? "updated" : "unchanged"}`,
  );
  console.log(
    `- ${METADATA_OUTPUT_PATH}: ${metadataWritten ? "updated" : "unchanged"}`,
  );
}

run().catch((error: unknown) => {
  console.error("Fire organization ETL failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
