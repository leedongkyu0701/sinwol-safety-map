import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { assertUniqueValues } from "../../../src/shared/lib/validation";
import {
  aedFacilitiesSchema,
  fireWaterFacilitiesSchema,
  otherFacilitiesSchema,
  heatShelterFacilitiesSchema,
  childSafetyHouseFacilitiesSchema,
  shelterFacilitiesSchema,
} from "../../../src/shared/schemas/facility";
import {
  metadataSchema,
  type DataMetadata,
} from "../../../src/shared/schemas/metadata";
import { FIRE_WATER_SUBTYPES } from "../../../src/shared/types/facility";
import {
  AED_OUTPUT_PATH,
  AED_PENDING_REVIEW_PATH,
  AED_SOURCE_NAME,
} from "../aed/constants";
import {
  aedPendingReviewSchema,
  findSourceIdOverlap,
  readAedMobilityRegistry,
} from "../aed/mobility";
import {
  FIRE_WATER_INPUT_PATH,
  FIRE_WATER_OUTPUT_PATH,
  FIRE_WATER_SOURCE_NAME,
  METADATA_OUTPUT_PATH,
} from "../fire-water/constants";
import {
  SHELTER_ACTIVE_STATUS,
  SHELTER_OUTPUT_PATH,
  SHELTER_SOURCE_NAME,
} from "../shelters/constants";
import {
  FIRE_ORG_ID_PREFIX,
  FIRE_ORG_METADATA_KEY,
  FIRE_ORG_SOURCE_NAME,
  OTHER_OUTPUT_PATH,
} from "../other/fire-org/constants";
import {
  HEAT_SHELTER_ID_PREFIX,
  HEAT_SHELTER_METADATA_KEY,
  HEAT_SHELTER_SOURCE_NAME,
} from "../other/heat-shelter/constants";
import {
  CHILD_SAFETY_HOUSE_ID_PREFIX,
  CHILD_SAFETY_HOUSE_METADATA_KEY,
  CHILD_SAFETY_HOUSE_SOURCE_NAME,
} from "../other/child-safety-house/constants";
import { calculateFileSha256 } from "./file-hash";
import { readJsonFileIfExists } from "./write-json";

const FORBIDDEN_MISSING_STRINGS = new Set(["nan", "n/a"]);

function readRequiredJson(path: string): unknown {
  const value = readJsonFileIfExists(path);

  if (value === undefined) {
    throw new Error(`Required published JSON not found: ${path}`);
  }

  return value;
}

function containsForbiddenMissingString(value: unknown): boolean {
  if (typeof value === "string") {
    return FORBIDDEN_MISSING_STRINGS.has(value.trim().toLowerCase());
  }

  if (Array.isArray(value)) {
    return value.some(containsForbiddenMissingString);
  }

  if (value !== null && typeof value === "object") {
    return Object.values(value).some(containsForbiddenMissingString);
  }

  return false;
}

function containsForbiddenKey(
  value: unknown,
  forbiddenKeys: ReadonlySet<string>,
): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKey(item, forbiddenKeys));
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).some(
      ([key, child]) =>
        forbiddenKeys.has(key) || containsForbiddenKey(child, forbiddenKeys),
    );
  }

  return false;
}

function verifyFireWater(metadata: DataMetadata): number {
  const rawFacilities = readRequiredJson(FIRE_WATER_OUTPUT_PATH);
  const facilities = fireWaterFacilitiesSchema.parse(rawFacilities);

  assertUniqueValues(
    facilities.map((facility) => facility.sourceId),
    "fire water sourceId",
  );
  assertUniqueValues(
    facilities.map((facility) => facility.id),
    "fire water id",
  );
  assert.equal(
    metadata.sources.fireWater.count,
    facilities.length,
    "Fire water metadata count must match the published dataset",
  );
  assert.equal(
    metadata.sources.fireWater.source,
    FIRE_WATER_SOURCE_NAME,
    "Fire water metadata source must match the configured source",
  );
  assert.equal(
    typeof metadata.sources.fireWater.sourceFileSha256,
    "string",
    "Fire water metadata must contain the source XLSX SHA-256",
  );
  assert.equal(
    containsForbiddenMissingString(rawFacilities),
    false,
    "Published fire water data contains a forbidden missing-value string",
  );

  if (existsSync(FIRE_WATER_INPUT_PATH)) {
    assert.equal(
      metadata.sources.fireWater.sourceFileSha256,
      calculateFileSha256(FIRE_WATER_INPUT_PATH),
      "Published metadata SHA-256 must match the local source XLSX",
    );
  }

  const subtypeCounts = Object.fromEntries(
    FIRE_WATER_SUBTYPES.map((subtype) => [
      subtype,
      facilities.filter((facility) => facility.subtype === subtype).length,
    ]),
  );

  console.log(`Fire water rows: ${facilities.length.toLocaleString("en-US")}`);
  console.log(`Fire water subtype: ${JSON.stringify(subtypeCounts)}`);

  return facilities.length;
}

function verifyShelters(metadata: DataMetadata): number {
  const rawFacilities = readRequiredJson(SHELTER_OUTPUT_PATH);
  const facilities = shelterFacilitiesSchema.parse(rawFacilities);

  assertUniqueValues(
    facilities.map((facility) => facility.sourceId),
    "shelter sourceId",
  );
  assertUniqueValues(
    facilities.map((facility) => facility.id),
    "shelter id",
  );
  assert.equal(
    facilities.every((facility) => facility.category === "SHELTER"),
    true,
    "All published shelters must use the SHELTER category",
  );
  assert.equal(
    facilities.every(
      (facility) => facility.details.status === SHELTER_ACTIVE_STATUS,
    ),
    true,
    "All published shelters must be active",
  );
  assert.equal(
    metadata.sources.shelter.count,
    facilities.length,
    "Shelter metadata count must match the published dataset",
  );
  assert.equal(
    metadata.sources.shelter.source,
    SHELTER_SOURCE_NAME,
    "Shelter metadata source must match the configured source",
  );
  assert.equal(
    typeof metadata.sources.shelter.fetchedAt,
    "string",
    "Shelter metadata must contain fetchedAt",
  );
  assert.equal(
    containsForbiddenMissingString(rawFacilities),
    false,
    "Published shelter data contains a forbidden missing-value string",
  );

  console.log(`Shelter rows: ${facilities.length.toLocaleString("en-US")}`);
  console.log(`Shelter fetchedAt: ${metadata.sources.shelter.fetchedAt}`);

  return facilities.length;
}

function verifyAeds(metadata: DataMetadata): number {
  const rawFacilities = readRequiredJson(AED_OUTPUT_PATH);
  const facilities = aedFacilitiesSchema.parse(rawFacilities);
  const rawPendingReview = readRequiredJson(AED_PENDING_REVIEW_PATH);
  const pendingReview = aedPendingReviewSchema.parse(rawPendingReview);
  const mobilityRegistry = readAedMobilityRegistry();
  const reviewedMobileSourceIds = new Set(
    mobilityRegistry.decisions
      .filter((decision) => decision.mobility === "MOBILE")
      .map((decision) => decision.sourceId),
  );

  assertUniqueValues(
    facilities.map((facility) => facility.sourceId),
    "AED sourceId",
  );
  assertUniqueValues(
    facilities.map((facility) => facility.id),
    "AED id",
  );
  assert.equal(
    facilities.every((facility) => facility.category === "AED"),
    true,
    "All published AEDs must use the AED category",
  );
  assert.equal(
    facilities.every((facility) => facility.subtype === "AED"),
    true,
    "All published AEDs must use the AED subtype",
  );
  assert.equal(
    facilities.every((facility) => facility.details.mobility === "FIXED"),
    true,
    "All published AEDs must be FIXED",
  );
  assert.deepEqual(
    findSourceIdOverlap(
      reviewedMobileSourceIds,
      facilities.map((facility) => facility.sourceId),
    ),
    [],
    "Reviewed MOBILE AEDs must not be published",
  );
  assert.deepEqual(
    findSourceIdOverlap(
      pendingReview.candidates.map((candidate) => candidate.sourceId),
      facilities.map((facility) => facility.sourceId),
    ),
    [],
    "Pending AED candidates must not be published",
  );
  assert.equal(
    metadata.sources.aed.count,
    facilities.length,
    "AED metadata count must match the published dataset",
  );
  assert.equal(
    metadata.sources.aed.source,
    AED_SOURCE_NAME,
    "AED metadata source must match the configured source",
  );
  assert.equal(
    typeof metadata.sources.aed.fetchedAt,
    "string",
    "AED metadata must contain fetchedAt",
  );
  assert.equal(
    containsForbiddenMissingString(rawFacilities),
    false,
    "Published AED data contains a forbidden missing-value string",
  );
  assert.equal(
    containsForbiddenKey(rawFacilities, new Set(["manager", "managerTel"])),
    false,
    "Published AED data contains a forbidden manager field",
  );
  assert.equal(
    containsForbiddenKey(rawPendingReview, new Set(["manager", "managerTel"])),
    false,
    "AED pending review contains a forbidden manager field",
  );

  console.log(`AED rows: ${facilities.length.toLocaleString("en-US")}`);
  console.log(`AED pending review: ${pendingReview.candidates.length}`);
  console.log(`AED fetchedAt: ${metadata.sources.aed.fetchedAt}`);

  return facilities.length;
}

function verifyOther(metadata: DataMetadata): number {
  const rawFacilities = readRequiredJson(OTHER_OUTPUT_PATH);
  const facilities = otherFacilitiesSchema.parse(rawFacilities);
  const fireOrgFacilities = facilities.filter((facility) =>
    facility.id.startsWith(FIRE_ORG_ID_PREFIX),
  );
  const fireOrgMetadata =
    metadata.sources.other.datasets?.[FIRE_ORG_METADATA_KEY];
  const heatShelterFacilities = heatShelterFacilitiesSchema.parse(
    facilities.filter((facility) => facility.id.startsWith(HEAT_SHELTER_ID_PREFIX)),
  );
  const heatShelterMetadata =
    metadata.sources.other.datasets?.[HEAT_SHELTER_METADATA_KEY];
  const childSafetyHouseFacilities = childSafetyHouseFacilitiesSchema.parse(
    facilities.filter((facility) => facility.id.startsWith(CHILD_SAFETY_HOUSE_ID_PREFIX)),
  );
  const childSafetyHouseMetadata =
    metadata.sources.other.datasets?.[CHILD_SAFETY_HOUSE_METADATA_KEY];

  assertUniqueValues(
    facilities.map((facility) => facility.id),
    "OTHER facility id",
  );
  assertUniqueValues(
    fireOrgFacilities.map((facility) => facility.sourceId),
    "fire organization sourceId",
  );
  assertUniqueValues(
    heatShelterFacilities.map((facility) => facility.sourceId),
    "heat shelter sourceId",
  );
  assertUniqueValues(
    childSafetyHouseFacilities.map((facility) => facility.sourceId),
    "child safety house sourceId",
  );
  assert.equal(
    facilities.every((facility) => facility.category === "OTHER"),
    true,
    "All published OTHER facilities must use the OTHER category",
  );
  assert.equal(
    metadata.sources.other.count,
    facilities.length,
    "OTHER metadata count must match the published dataset",
  );
  assert.equal(
    containsForbiddenMissingString(rawFacilities),
    false,
    "Published OTHER data contains a forbidden missing-value string",
  );

  const datasetCount = Object.values(metadata.sources.other.datasets ?? {}).reduce(
    (total, dataset) => total + dataset.count,
    0,
  );
  assert.equal(
    datasetCount,
    metadata.sources.other.count,
    "OTHER dataset metadata counts must sum to the OTHER count",
  );

  if (fireOrgFacilities.length > 0 || fireOrgMetadata !== undefined) {
    assert.notEqual(
      fireOrgMetadata,
      undefined,
      "Fire organization metadata is required when fire-org rows exist",
    );
    assert.equal(
      fireOrgMetadata?.count,
      fireOrgFacilities.length,
      "Fire organization metadata count must match fire-org rows",
    );
    assert.equal(
      fireOrgMetadata?.source,
      FIRE_ORG_SOURCE_NAME,
      "Fire organization metadata source must match the configured source",
    );
    assert.equal(
      typeof fireOrgMetadata?.fetchedAt,
      "string",
      "Fire organization metadata must contain fetchedAt",
    );
  }

  if (heatShelterFacilities.length > 0 || heatShelterMetadata !== undefined) {
    assert.notEqual(
      heatShelterMetadata,
      undefined,
      "Heat shelter metadata is required when heat shelter rows exist",
    );
    assert.equal(
      heatShelterMetadata?.count,
      heatShelterFacilities.length,
      "Heat shelter metadata count must match heat shelter rows",
    );
    assert.equal(
      heatShelterMetadata?.source,
      HEAT_SHELTER_SOURCE_NAME,
      "Heat shelter metadata source must match the configured source",
    );
    assert.equal(
      typeof heatShelterMetadata?.fetchedAt,
      "string",
      "Heat shelter metadata must contain fetchedAt",
    );
  }

  if (childSafetyHouseFacilities.length > 0 || childSafetyHouseMetadata !== undefined) {
    assert.notEqual(
      childSafetyHouseMetadata,
      undefined,
      "Child safety house metadata is required when child safety house rows exist",
    );
    assert.equal(
      childSafetyHouseMetadata?.count,
      childSafetyHouseFacilities.length,
      "Child safety house metadata count must match rows",
    );
    assert.equal(
      childSafetyHouseMetadata?.source,
      CHILD_SAFETY_HOUSE_SOURCE_NAME,
      "Child safety house metadata source must match configured source",
    );
    assert.equal(
      typeof childSafetyHouseMetadata?.fetchedAt,
      "string",
      "Child safety house metadata must contain fetchedAt",
    );
  }

  console.log(`OTHER rows: ${facilities.length.toLocaleString("en-US")}`);
  console.log(
    `Fire organization rows: ${fireOrgFacilities.length.toLocaleString("en-US")}`,
  );
  console.log(
    `Heat shelter rows: ${heatShelterFacilities.length.toLocaleString("en-US")}`,
  );
  console.log(
    `Child safety house rows: ${childSafetyHouseFacilities.length.toLocaleString("en-US")}`,
  );

  return facilities.length;
}

function run(): void {
  const metadata = metadataSchema.parse(readRequiredJson(METADATA_OUTPUT_PATH));
  const fireWaterCount = verifyFireWater(metadata);
  const shelterCount = verifyShelters(metadata);
  const aedCount = verifyAeds(metadata);
  const otherCount = verifyOther(metadata);

  console.log("\nPublished data verification passed");
  console.log(
    `Total published rows: ${fireWaterCount + shelterCount + aedCount + otherCount}`,
  );
}

try {
  run();
} catch (error) {
  console.error("Published data verification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
