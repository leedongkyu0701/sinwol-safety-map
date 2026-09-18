import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { assertUniqueValues } from "../../../src/shared/lib/validation";
import {
  aedFacilitiesSchema,
  fireWaterFacilitiesSchema,
  shelterFacilitiesSchema,
} from "../../../src/shared/schemas/facility";
import {
  metadataSchema,
  type DataMetadata,
} from "../../../src/shared/schemas/metadata";
import { FIRE_WATER_SUBTYPES } from "../../../src/shared/types/facility";
import {
  AED_OUTPUT_PATH,
  AED_SOURCE_NAME,
} from "../aed/constants";
import { readAedMobilityRegistry } from "../aed/mobility";
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
  assert.equal(
    facilities.some((facility) => reviewedMobileSourceIds.has(facility.sourceId)),
    false,
    "Reviewed MOBILE AEDs must not be published",
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

  console.log(`AED rows: ${facilities.length.toLocaleString("en-US")}`);
  console.log(`AED fetchedAt: ${metadata.sources.aed.fetchedAt}`);

  return facilities.length;
}

function run(): void {
  const metadata = metadataSchema.parse(readRequiredJson(METADATA_OUTPUT_PATH));
  const fireWaterCount = verifyFireWater(metadata);
  const shelterCount = verifyShelters(metadata);
  const aedCount = verifyAeds(metadata);

  console.log("\nPublished data verification passed");
  console.log(
    `Total published rows: ${fireWaterCount + shelterCount + aedCount}`,
  );
}

try {
  run();
} catch (error) {
  console.error("Published data verification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
