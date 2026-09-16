import assert from "node:assert/strict";

import {
  normalizeOptionalString,
  parseOptionalNumber,
  parseRequiredNumber,
} from "../../../src/shared/lib/normalize";
import {
  assertSeoulCoordinate,
  assertUniqueValues,
  createNamespacedId,
} from "../../../src/shared/lib/validation";
import { mapFireWaterSubtype } from "../fire-water/transform";

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
assert.doesNotThrow(() => assertUniqueValues(["a", "b"], "id"));
assert.throws(() => assertUniqueValues(["a", "a"], "id"));
assert.equal(mapFireWaterSubtype("01"), "ABOVE_GROUND_HYDRANT");
assert.equal(mapFireWaterSubtype(2), "UNDERGROUND_HYDRANT");
assert.equal(mapFireWaterSubtype("06"), "EMERGENCY_FIRE_DEVICE");
assert.throws(() => mapFireWaterSubtype("99"));

console.log("Data utility verification passed");
