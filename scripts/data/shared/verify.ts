import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { assertUniqueValues } from "../../../src/shared/lib/validation";
import { fireWaterFacilitiesSchema } from "../../../src/shared/schemas/facility";
import { metadataSchema } from "../../../src/shared/schemas/metadata";
import { FIRE_WATER_SUBTYPES } from "../../../src/shared/types/facility";
import {
  FIRE_WATER_INPUT_PATH,
  FIRE_WATER_OUTPUT_PATH,
  FIRE_WATER_SOURCE_NAME,
  METADATA_OUTPUT_PATH,
} from "../fire-water/constants";
import { calculateFileSha256 } from "./file-hash";
import { readJsonFileIfExists } from "./write-json";

function readRequiredJson(path: string): unknown {
  const value = readJsonFileIfExists(path);

  if (value === undefined) {
    throw new Error(`Required published JSON not found: ${path}`);
  }

  return value;
}

function containsNanString(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "nan";
  }

  if (Array.isArray(value)) {
    return value.some(containsNanString);
  }

  if (value !== null && typeof value === "object") {
    return Object.values(value).some(containsNanString);
  }

  return false;
}

function run(): void {
  const rawFacilities = readRequiredJson(FIRE_WATER_OUTPUT_PATH);
  const facilities = fireWaterFacilitiesSchema.parse(rawFacilities);
  const metadata = metadataSchema.parse(readRequiredJson(METADATA_OUTPUT_PATH));

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
    containsNanString(rawFacilities),
    false,
    'Published fire water data must not contain the string "nan"',
  );

  const subtypeCounts = Object.fromEntries(
    FIRE_WATER_SUBTYPES.map((subtype) => [
      subtype,
      facilities.filter((facility) => facility.subtype === subtype).length,
    ]),
  );

  if (existsSync(FIRE_WATER_INPUT_PATH)) {
    assert.equal(
      metadata.sources.fireWater.sourceFileSha256,
      calculateFileSha256(FIRE_WATER_INPUT_PATH),
      "Published metadata SHA-256 must match the local source XLSX",
    );
  }

  console.log("Published data verification passed\n");
  console.log(`Fire water rows: ${facilities.length.toLocaleString("en-US")}`);
  console.log(`Subtype: ${JSON.stringify(subtypeCounts)}`);
  console.log(`Metadata count: ${metadata.sources.fireWater.count}`);
  console.log(
    `Source SHA-256: ${metadata.sources.fireWater.sourceFileSha256}`,
  );
}

try {
  run();
} catch (error) {
  console.error("Published data verification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
