import assert from "node:assert/strict";

import {
  normalizeOptionalString,
  parseOptionalNumber,
  parseRequiredNumber,
} from "../../../src/shared/lib/normalize";
import {
  assertReasonableRecordCount,
  assertSeoulCoordinate,
  assertUniqueValues,
  createNamespacedId,
  hasNamespacedId,
} from "../../../src/shared/lib/validation";
import type { DataMetadata } from "../../../src/shared/schemas/metadata";
import {
  aedFacilitySchema,
  fireWaterFacilitiesSchema,
  otherFacilitySchema,
  shelterFacilitySchema,
} from "../../../src/shared/schemas/facility";
import { mapFireWaterSubtype } from "../fire-water/transform";
import { updateSourceMetadata } from "./metadata";

assert.equal(normalizeOptionalString("nan"), undefined);
assert.equal(normalizeOptionalString("NaN"), undefined);
assert.equal(normalizeOptionalString("N/A"), undefined);
assert.equal(normalizeOptionalString("  value  "), "value");
assert.equal(parseOptionalNumber(" 2.5 "), 2.5);
assert.equal(parseOptionalNumber(""), undefined);
assert.equal(parseRequiredNumber("37.52", "latitude"), 37.52);
assert.throws(() => parseRequiredNumber("Infinity", "coordinate"));
assert.doesNotThrow(() => assertSeoulCoordinate(37.52, 126.84));
assert.throws(() => assertSeoulCoordinate(35.18, 129.07));
assert.equal(
  createNamespacedId("fire-water", "양천-신월-001"),
  "fire-water:양천-신월-001",
);
assert.equal(
  hasNamespacedId(
    "fire-water",
    "fire-water:양천-신월-001",
    "양천-신월-001",
  ),
  true,
);
assert.doesNotThrow(() => assertUniqueValues(["a", "b"], "id"));
assert.throws(() => assertUniqueValues(["a", "a"], "id"));
assert.doesNotThrow(() =>
  assertReasonableRecordCount({
    label: "test",
    previousCount: 100,
    nextCount: 80,
    maxDecreaseRatio: 0.2,
  }),
);
assert.throws(() =>
  assertReasonableRecordCount({
    label: "test",
    previousCount: 100,
    nextCount: 79,
    maxDecreaseRatio: 0.2,
  }),
);
assert.throws(() =>
  assertReasonableRecordCount({
    label: "test",
    previousCount: 100,
    nextCount: 0,
    maxDecreaseRatio: 0.2,
  }),
);
assert.equal(mapFireWaterSubtype("01"), "ABOVE_GROUND_HYDRANT");
assert.equal(mapFireWaterSubtype(2), "UNDERGROUND_HYDRANT");
assert.equal(mapFireWaterSubtype("06"), "EMERGENCY_FIRE_DEVICE");
assert.throws(() => mapFireWaterSubtype("99"));
assert.equal(fireWaterFacilitiesSchema.safeParse([]).success, false);

const baseFacility = {
  name: "검증용 시설",
  latitude: 37.52,
  longitude: 126.84,
  address: "서울특별시 양천구 신월동",
  source: "검증용 Source",
  sourceId: "source-1",
};

assert.equal(
  shelterFacilitySchema.safeParse({
    ...baseFacility,
    id: "shelter:source-1",
    category: "SHELTER",
    subtype: "CIVIL_DEFENSE_SHELTER",
    details: { status: "사용중" },
  }).success,
  true,
);
assert.equal(
  aedFacilitySchema.safeParse({
    ...baseFacility,
    id: "wrong:source-1",
    category: "AED",
    subtype: "AED",
    details: { mobility: "FIXED" },
  }).success,
  false,
);
assert.equal(
  otherFacilitySchema.safeParse({
    ...baseFacility,
    id: "other:source-1",
    category: "OTHER",
    subtype: "FUTURE_TYPE",
    details: { arbitrary: true },
  }).success,
  false,
);
assert.equal(
  otherFacilitySchema.safeParse({
    ...baseFacility,
    id: "other:source-1",
    category: "OTHER",
    subtype: "FUTURE_TYPE",
    details: {},
  }).success,
  true,
);

const existingMetadata: DataMetadata = {
  schemaVersion: 1,
  generatedAt: "2026-09-16T00:00:00.000Z",
  sources: {
    fireWater: { count: 936 },
    shelter: { count: 44, fetchedAt: "2026-09-16T01:00:00.000Z" },
    aed: { count: 98, fetchedAt: "2026-09-16T02:00:00.000Z" },
    other: { count: 0 },
  },
};
const updatedMetadata = updateSourceMetadata(
  existingMetadata,
  "fireWater",
  { count: 940 },
  {
    publishedDataChanged: true,
    generatedAt: "2026-09-17T00:00:00.000Z",
  },
);

assert.equal(updatedMetadata.sources.fireWater.count, 940);
assert.deepEqual(updatedMetadata.sources.shelter, existingMetadata.sources.shelter);
assert.deepEqual(updatedMetadata.sources.aed, existingMetadata.sources.aed);
assert.equal(updatedMetadata.generatedAt, "2026-09-17T00:00:00.000Z");

const unchangedMetadata = updateSourceMetadata(
  existingMetadata,
  "fireWater",
  existingMetadata.sources.fireWater,
  {
    publishedDataChanged: false,
    generatedAt: "2026-09-18T00:00:00.000Z",
  },
);

assert.equal(unchangedMetadata.generatedAt, existingMetadata.generatedAt);

console.log("Data utility tests passed");
