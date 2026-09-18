import assert from "node:assert/strict";

import {
  formatAedTimeRange,
  normalizeAedTime,
} from "../../../src/shared/lib/operating-hours";
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
  aedFacilitiesSchema,
  aedFacilitySchema,
  fireWaterFacilitiesSchema,
  otherFacilitySchema,
  shelterFacilitiesSchema,
  shelterFacilitySchema,
} from "../../../src/shared/schemas/facility";
import { mapFireWaterSubtype } from "../fire-water/transform";
import {
  aedMobilityRegistrySchema,
  detectMobilityCandidate,
  findStaleReviewDecisions,
  resolveMobilityDecision,
  type AedMobilityRegistry,
} from "../aed/mobility";
import { normalizeAedOperatingHours } from "../aed/operating-hours";
import { transformAedRows } from "../aed/transform";
import { transformShelterRows } from "../shelters/transform";
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
assert.equal(createNamespacedId("aed", "080-1"), "aed:080-1");
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
assert.equal(shelterFacilitiesSchema.safeParse([]).success, false);
assert.equal(aedFacilitiesSchema.safeParse([]).success, false);

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
    id: "aed:source-1",
    category: "AED",
    subtype: "AED",
    details: { mobility: "FIXED" },
  }).success,
  true,
);
assert.equal(
  aedFacilitySchema.safeParse({
    ...baseFacility,
    id: "aed:source-1",
    category: "AED",
    subtype: "AED",
    details: { mobility: "MOBILE" },
  }).success,
  false,
);
assert.equal(
  aedFacilitySchema.safeParse({
    ...baseFacility,
    id: "aed:source-1",
    category: "AED",
    subtype: "PORTABLE_AED",
    details: { mobility: "FIXED" },
  }).success,
  false,
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

const shelterTransform = transformShelterRows([
  {
    OGDP_INST_CD: "3140000",
    MNG_NO: "3140000-S1",
    SALS_STTS_NM: "사용중",
    LOTNO_ADDR: "서울특별시 양천구 신월동 1",
    ROAD_NM_ADDR: "서울특별시 양천구 테스트로 1",
    BPLC_NM: "테스트 대피시설",
    XCRD: "37.52",
    YCRD: "126.84",
  },
  {
    OGDP_INST_CD: "3140000",
    MNG_NO: "3140000-S2",
    SALS_STTS_NM: "사용중지",
    LOTNO_ADDR: "서울특별시 양천구 신월동 2",
    ROAD_NM_ADDR: "서울특별시 양천구 테스트로 2",
    BPLC_NM: "중지 대피시설",
    XCRD: "37.53",
    YCRD: "126.85",
  },
  {
    OGDP_INST_CD: "9999999",
    MNG_NO: "OUTSIDE-S1",
    SALS_STTS_NM: "사용중",
    LOTNO_ADDR: "서울특별시 다른구 신월동 1",
    ROAD_NM_ADDR: null,
    BPLC_NM: "지역 외 시설",
    XCRD: "37.54",
    YCRD: "126.86",
  },
]);

assert.equal(shelterTransform.yangcheonRows, 2);
assert.equal(shelterTransform.sinwolRows, 2);
assert.equal(shelterTransform.activeRows, 1);
assert.equal(shelterTransform.inactiveRows, 1);
assert.equal(shelterTransform.facilities.length, 1);
assert.equal(shelterTransform.facilities[0].latitude, 37.52);
assert.equal(shelterTransform.facilities[0].longitude, 126.84);
assert.equal(shelterTransform.facilities[0].id, "shelter:3140000-S1");
assert.deepEqual(shelterTransform.unknownStatuses, []);

const shelterUnknownStatus = transformShelterRows([
  {
    OGDP_INST_CD: "3140000",
    MNG_NO: "3140000-S3",
    SALS_STTS_NM: "새로운상태",
    LOTNO_ADDR: "서울특별시 양천구 신월동 3",
    ROAD_NM_ADDR: "서울특별시 양천구 테스트로 3",
    BPLC_NM: "상태 검증 시설",
    XCRD: "37.52",
    YCRD: "126.84",
  },
]);

assert.deepEqual(shelterUnknownStatus.unknownStatuses, ["새로운상태"]);

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

assert.equal(normalizeAedTime("0000", "start"), "0000");
assert.equal(normalizeAedTime("2500", "end"), "2500");
assert.throws(() => normalizeAedTime("2400", "start"));
assert.throws(() => normalizeAedTime("2460", "end"));
assert.equal(formatAedTimeRange("0000", "2400"), "24시간");
assert.equal(formatAedTimeRange("0900", "1800"), "09:00–18:00");
assert.equal(formatAedTimeRange("0900", "2500"), "09:00–익일 01:00");
assert.equal(formatAedTimeRange("0900", "2430"), "09:00–익일 00:30");
assert.equal(formatAedTimeRange("0900", "2440"), "09:00–익일 00:40");

const candidateInput = {
  sourceId: "candidate-1",
  org: "테스트 기관",
  buildPlace: "순찰차 내부",
  buildAddress: "서울특별시 양천구 신월동",
};
const detectedCandidate = detectMobilityCandidate(candidateInput);
assert.equal(detectedCandidate.isCandidate, true);
assert.deepEqual(detectedCandidate.reasons, ["buildPlace contains 순찰차"]);
assert.equal(resolveMobilityDecision(candidateInput).mobility, undefined);
assert.deepEqual(
  resolveMobilityDecision(candidateInput, {
    sourceId: "candidate-1",
    mobility: "FIXED",
    note: "건물 내부 고정",
  }),
  {
    isCandidate: true,
    reasons: ["buildPlace contains 순찰차"],
    mobility: "FIXED",
    reviewed: true,
  },
);
assert.equal(
  resolveMobilityDecision({
    sourceId: "fixed-1",
    org: "고정 시설",
    buildAddress: "서울특별시 양천구 신월동",
  }).mobility,
  "FIXED",
);

const mobilityRegistry: AedMobilityRegistry = {
  schemaVersion: 1,
  decisions: [
    { sourceId: "candidate-1", mobility: "MOBILE" },
    { sourceId: "stale-1", mobility: "FIXED" },
  ],
};
assert.deepEqual(
  findStaleReviewDecisions(mobilityRegistry, new Set(["candidate-1"])).map(
    (decision) => decision.sourceId,
  ),
  ["stale-1"],
);
assert.equal(
  aedMobilityRegistrySchema.safeParse({
    schemaVersion: 1,
    decisions: [
      { sourceId: "duplicate", mobility: "FIXED" },
      { sourceId: "duplicate", mobility: "MOBILE" },
    ],
  }).success,
  false,
);

const noHours = normalizeAedOperatingHours(
  {
    serialSeq: "hours-1",
    org: "시간 검증 시설",
    buildAddress: "서울특별시 양천구 신월동",
    wgs84Lat: "37.52",
    wgs84Lon: "126.84",
  },
  "hours test",
);
assert.equal(noHours.operatingHours, undefined);
assert.equal(noHours.audit.missingDayFields, 8);

const duplicateAedRow = {
  serialSeq: "duplicate-aed",
  org: "중복 검증 시설",
  buildAddress: "서울특별시 양천구 신월동",
  wgs84Lat: "37.52",
  wgs84Lon: "126.84",
};
assert.throws(() =>
  transformAedRows(
    [duplicateAedRow, duplicateAedRow],
    { schemaVersion: 1, decisions: [] },
  ),
);

console.log("Data utility tests passed");
