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
import {
  metadataSchema,
  type DataMetadata,
} from "../../../src/shared/schemas/metadata";
import {
  aedFacilitiesSchema,
  aedFacilitySchema,
  fireOrganizationFacilitySchema,
  fireWaterFacilitiesSchema,
  heatShelterFacilitySchema,
  childSafetyHouseFacilitiesSchema,
  childSafetyHouseFacilitySchema,
  otherFacilitiesSchema,
  otherFacilitySchema,
  shelterFacilitiesSchema,
  shelterFacilitySchema,
} from "../../../src/shared/schemas/facility";
import { mapFireWaterSubtype } from "../fire-water/transform";
import { assertAedAudit, auditAedFacilities } from "../aed/audit";
import {
  aedMobilityRegistrySchema,
  aedPendingReviewSchema,
  createAedPendingReview,
  detectMobilityCandidate,
  findSourceIdOverlap,
  findStaleReviewDecisions,
  resolveMobilityDecision,
  type AedMobilityRegistry,
} from "../aed/mobility";
import { normalizeAedOperatingHours } from "../aed/operating-hours";
import { aedSourceRowSchema } from "../aed/schema";
import { transformAedRows } from "../aed/transform";
import { transformShelterRows } from "../shelters/transform";
import { convertEpsg5186ToWgs84 } from "../other/fire-org/coordinates";
import { classifyFireOrganizationSubtype } from "../other/fire-org/transform";
import { mergeOtherFacilitiesByIdPrefix } from "../other/shared/merge";
import {
  normalizeHeatShelterHours,
  normalizeOptionalHeatShelterHours,
} from "../other/heat-shelter/operating-hours";
import {
  createHeatShelterSourceId,
  transformHeatShelterRows,
} from "../other/heat-shelter/transform";
import { assertHeatShelterAudit, auditHeatShelterFacilities } from "../other/heat-shelter/audit";
import { heatShelterSourceRowSchema } from "../other/heat-shelter/schema";
import { childSafetyHouseReferenceSchema, childSafetyHouseSourceRowSchema } from "../other/child-safety-house/schema";
import {
  assertChildSafetyHouseReview,
  normalizeChildSafetyHousePhone,
  transformChildSafetyHouseRows,
} from "../other/child-safety-house/transform";
import { createFacilityDetailViewModel } from "../../../src/features/facilities/lib/facility-detail-view-model";
import {
  updateOtherDatasetMetadata,
  updateSourceMetadata,
} from "./metadata";

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
assert.equal(otherFacilitiesSchema.safeParse([]).success, true);

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
    id: "fire-org:source-1",
    category: "OTHER",
    subtype: "UNKNOWN",
    details: {},
  }).success,
  false,
);
assert.equal(
  fireOrganizationFacilitySchema.safeParse({
    ...baseFacility,
    id: "fire-org:source-1",
    category: "OTHER",
    subtype: "FIRE_SAFETY_CENTER",
    details: {},
  }).success,
  true,
);

const childSafetyFixture = (overrides: Record<string, unknown> = {}) =>
  childSafetyHouseSourceRowSchema.parse({
    rn: 1,
    lcSn: 50034669,
    bsshNm: "신월 테스트 지킴이집",
    telno: "02-1234-5678",
    adres: "서울특별시 양천구 신월동 테스트로 1",
    etcAdres: "101호",
    zip: "08000",
    lcinfoLa: 37.52,
    lcinfoLo: 126.84,
    cl: "09",
    clNm: "아동안전지킴이집",
    scopeCd: null,
    scope: null,
    hmpg: null,
    ...overrides,
  });
const childDecision = {
  schemaVersion: 1 as const,
  scope: "서울특별시 양천구 신월동" as const,
  decisions: [
    {
      sourceId: "50034669",
      decision: "INCLUDE" as const,
      expectedName: "신월 테스트 지킴이집",
      expectedAddress: "서울특별시 양천구 신월동 테스트로 1",
      reason: "검증된 신월동 주소",
    },
  ],
};
assert.equal(childSafetyHouseFacilitySchema.safeParse({
  ...baseFacility,
  id: "child-safety-house:50034669",
  sourceId: "50034669",
  category: "OTHER",
  subtype: "CHILD_SAFETY_HOUSE",
  details: { phone: "02-1234-5678" },
}).success, true);
assert.equal(childSafetyHouseFacilitySchema.safeParse({
  ...baseFacility,
  id: "wrong:50034669",
  sourceId: "50034669",
  category: "OTHER",
  subtype: "CHILD_SAFETY_HOUSE",
  details: {},
}).success, false);
assert.equal(otherFacilitySchema.safeParse({
  ...baseFacility,
  id: "other:1",
  category: "OTHER",
  subtype: "UNKNOWN",
  details: {},
}).success, false);
const child = childSafetyFixture();
const childTransformed = transformChildSafetyHouseRows([child], childDecision);
const childFacilities = childSafetyHouseFacilitiesSchema.parse(childTransformed.facilities);
assert.equal(childTransformed.facilities[0].sourceId, "50034669");
assert.equal(childTransformed.facilities[0].id, "child-safety-house:50034669");
assert.equal(childTransformed.facilities[0].detailLocation, "101호");
assert.equal(transformChildSafetyHouseRows([child], childDecision).facilities[0].id, childTransformed.facilities[0].id);
assert.deepEqual(
  transformChildSafetyHouseRows([child, childSafetyFixture({ lcSn: 50034670, bsshNm: "다른 신월 시설", telno: null })], {
    ...childDecision,
    decisions: [
      ...childDecision.decisions,
      { sourceId: "50034670", decision: "INCLUDE", expectedName: "다른 신월 시설", expectedAddress: "서울특별시 양천구 신월동 테스트로 1" },
    ],
  }).facilities.map((facility) => facility.sourceId),
  transformChildSafetyHouseRows([childSafetyFixture({ lcSn: 50034670, bsshNm: "다른 신월 시설", telno: null }), child], {
    ...childDecision,
    decisions: [
      ...childDecision.decisions,
      { sourceId: "50034670", decision: "INCLUDE", expectedName: "다른 신월 시설", expectedAddress: "서울특별시 양천구 신월동 테스트로 1" },
    ],
  }).facilities.map((facility) => facility.sourceId),
);
assert.equal(transformChildSafetyHouseRows([childSafetyFixture({ bsshNm: "다른 이름" })], {
  ...childDecision,
  decisions: [{ ...childDecision.decisions[0], expectedName: "다른 이름" }],
}).facilities[0].sourceId, "50034669");
assert.equal(transformChildSafetyHouseRows([childSafetyFixture({ adres: "서울특별시 양천구 신월동 테스트로 2" })], {
  ...childDecision,
  decisions: [{ ...childDecision.decisions[0], expectedAddress: "서울특별시 양천구 신월동 테스트로 2" }],
}).facilities[0].sourceId, "50034669");
assert.equal(transformChildSafetyHouseRows([childSafetyFixture({ adres: "서울특별시 양천구 목동로 1" })], {
  schemaVersion: 1,
  scope: "서울특별시 양천구 신월동",
  decisions: [],
}).candidates.length, 1);
assert.equal(transformChildSafetyHouseRows([childSafetyFixture({ adres: "서울특별시 강서구 공항대로 1" })], childDecision).candidates.length, 0);
const childUnreviewed = transformChildSafetyHouseRows([child], { ...childDecision, decisions: [] });
assert.equal(childUnreviewed.pendingCandidates.length, 1);
assert.throws(() => assertChildSafetyHouseReview(childUnreviewed), /Unreviewed/);
assert.equal(transformChildSafetyHouseRows([child], {
  ...childDecision,
  decisions: [{ ...childDecision.decisions[0], expectedAddress: "변경된 주소" }],
}).mismatchedReferenceIds.length, 1);
assert.throws(() => assertChildSafetyHouseReview(transformChildSafetyHouseRows([], childDecision)), /missing from current Source/);
assert.equal(transformChildSafetyHouseRows([child], {
  ...childDecision,
  decisions: [{ ...childDecision.decisions[0], decision: "EXCLUDE", reason: "경계 밖" }],
}).facilities.length, 0);
assert.equal(transformChildSafetyHouseRows([childSafetyFixture({ telno: "--" })], childDecision).facilities[0].details.phone, undefined);
assert.equal(normalizeChildSafetyHousePhone("031--").malformed, true);
assert.equal(transformChildSafetyHouseRows([child, child], childDecision).exactDuplicatesCollapsed, 1);
assert.throws(() => transformChildSafetyHouseRows([child, childSafetyFixture({ telno: "02-9999-9999" })], childDecision), /identity conflict/);
const distinctAtSamePoint = transformChildSafetyHouseRows([
  child,
  childSafetyFixture({ lcSn: 50034670, bsshNm: "다른 지킴이집", telno: null }),
], {
  ...childDecision,
  decisions: [
    ...childDecision.decisions,
    { sourceId: "50034670", decision: "INCLUDE", expectedName: "다른 지킴이집", expectedAddress: "서울특별시 양천구 신월동 테스트로 1" },
  ],
});
assert.equal(distinctAtSamePoint.facilities.length, 2);
assert.equal(distinctAtSamePoint.sameLocationGroups.length, 1);
assert.equal(childSafetyHouseReferenceSchema.safeParse(childDecision).success, true);
const childDetail = createFacilityDetailViewModel(childFacilities[0]);
assert.equal(childDetail.categoryLabel, "기타");
assert.equal(childDetail.subtypeLabel, "아동안전지킴이집");
assert.equal(childDetail.rows.some((row) => row.label === "전화번호" && row.value === "02-1234-5678"), true);
const childWithoutPhone = childSafetyHouseFacilitiesSchema.parse(
  transformChildSafetyHouseRows([childSafetyFixture({ telno: "--" })], childDecision).facilities,
)[0];
assert.equal(createFacilityDetailViewModel(childWithoutPhone).rows.some((row) => row.label === "전화번호"), false);
for (const subtype of [
  "FIRE_STATION",
  "FIRE_SAFETY_CENTER",
  "FIRE_RESCUE_UNIT",
] as const) {
  assert.equal(
    fireOrganizationFacilitySchema.safeParse({
      ...baseFacility,
      id: "fire-org:source-1",
      category: "OTHER",
      subtype,
      details: {},
    }).success,
    true,
  );
}
assert.equal(
  fireOrganizationFacilitySchema.safeParse({
    ...baseFacility,
    id: "other:source-1",
    category: "OTHER",
    subtype: "FIRE_SAFETY_CENTER",
    details: {},
  }).success,
  false,
);

const heatShelterFixture = (overrides: Record<string, unknown> = {}) =>
  heatShelterSourceRowSchema.parse({
    YEAR: "2026",
    AREA_CD: "1147056000",
    FACILITY_TYPE1: "복지시설",
    FACILITY_TYPE2: "회원이용시설",
    R_AREA_NM: "신월 테스트 쉼터",
    R_DETL_ADD: "서울특별시 양천구 신월로 1",
    LOTNO_ADDR: "서울특별시 양천구 신월동 1-1",
    RMRK: "확인 후 이용",
    LAT: "37.52",
    LON: "126.84",
    MAP_COORD_X: "0",
    MAP_COORD_Y: "0",
    OPR_DAYS: "월,화,수,목,금",
    OPR_START_TIME: "09:00",
    OPR_END_TIME: "18:00",
    EXT_OPR_YN: "N",
    EXT_OPR_DAYS: "",
    EXT_OPR_START_TIME: "",
    EXT_OPR_END_TIME: "",
    ADD_OPR_YN: "N",
    ADD_OPR_DAYS: "",
    ADD_OPR_START_TIME: "",
    ADD_OPR_END_TIME: "",
    ...overrides,
  });

assert.equal(
  heatShelterFacilitySchema.safeParse({
    ...baseFacility,
    id: "heat-shelter:source-1",
    category: "OTHER",
    subtype: "HEAT_SHELTER",
    details: {
      facilityType1: "복지시설",
      facilityType2: "회원이용시설",
      regularHours: { days: ["monday"], start: "09:00", end: "24:00" },
    },
  }).success,
  true,
);
assert.equal(
  heatShelterFacilitySchema.safeParse({
    ...baseFacility,
    id: "wrong:source-1",
    category: "OTHER",
    subtype: "HEAT_SHELTER",
    details: { facilityType1: "복지시설", facilityType2: "회원이용시설" },
  }).success,
  false,
);

const heatShelterSourceRow = heatShelterFixture();
const heatShelterTransform = transformHeatShelterRows([heatShelterSourceRow]);
assert.equal(heatShelterTransform.facilities.length, 1);
assert.equal(heatShelterTransform.areaSelectedRows, 1);
assert.equal(heatShelterTransform.facilities[0].details.facilityType2, "회원이용시설");
assert.equal(heatShelterTransform.facilities[0].roadAddress, "서울특별시 양천구 신월로 1");
assert.equal(heatShelterTransform.facilities[0].lotAddress, "서울특별시 양천구 신월동 1-1");
assert.equal(heatShelterTransform.facilities[0].id.startsWith("heat-shelter:"), true);
assert.equal(heatShelterTransform.areaAddressMismatchIdentities.length, 0);
assert.equal(
  transformHeatShelterRows([
    heatShelterFixture({ AREA_CD: "1147057000", R_AREA_NM: "신월2동 쉼터", LOTNO_ADDR: "서울특별시 양천구 신월동 2" }),
    heatShelterFixture({ AREA_CD: "1147055000", R_AREA_NM: "목동 쉼터", LOTNO_ADDR: "서울특별시 양천구 목동 1" }),
  ]).facilities.length,
  1,
);
const twoHeatShelters = [
  heatShelterFixture(),
  heatShelterFixture({ R_AREA_NM: "다른 시설", LOTNO_ADDR: "서울특별시 양천구 신월동 2" }),
];
assert.deepEqual(
  transformHeatShelterRows(twoHeatShelters).facilities.map((facility) => facility.sourceId),
  transformHeatShelterRows([...twoHeatShelters].reverse()).facilities.map((facility) => facility.sourceId),
);
const mismatchTransform = transformHeatShelterRows([
  heatShelterFixture({ R_AREA_NM: "행정코드만 신월", LOTNO_ADDR: "서울특별시 양천구 목동 99" }),
  heatShelterFixture({ AREA_CD: "1147055000", R_AREA_NM: "주소만 신월", LOTNO_ADDR: "서울특별시 양천구 신월동 99" }),
]);
assert.equal(mismatchTransform.areaAddressMismatchIdentities.length, 2);

const heatShelterIdentity = createHeatShelterSourceId(
  JSON.stringify(["1147056000", "신월 테스트 쉼터", "서울특별시 양천구 신월동 1-1"]),
);
assert.equal(heatShelterIdentity, createHeatShelterSourceId(
  JSON.stringify(["1147056000", "신월 테스트 쉼터", "서울특별시 양천구 신월동 1-1"]),
));
assert.match(heatShelterIdentity, /^[a-f0-9]{64}$/);
assert.equal(
  transformHeatShelterRows([heatShelterFixture(), heatShelterFixture({ R_AREA_NM: "다른 시설" })]).facilities.length,
  2,
);
assert.notEqual(
  transformHeatShelterRows([heatShelterFixture()]).facilities[0].sourceId,
  transformHeatShelterRows([heatShelterFixture({ R_AREA_NM: "다른 시설" })]).facilities[0].sourceId,
);
assert.notEqual(
  transformHeatShelterRows([heatShelterFixture()]).facilities[0].sourceId,
  transformHeatShelterRows([heatShelterFixture({ LOTNO_ADDR: "서울특별시 양천구 신월동 1-2" })]).facilities[0].sourceId,
);
assert.equal(
  transformHeatShelterRows([heatShelterFixture(), heatShelterFixture()]).exactDuplicatesCollapsed,
  1,
);
const heatShelterConflict = transformHeatShelterRows([
  heatShelterFixture(),
  heatShelterFixture({ LAT: "37.53" }),
]);
assert.equal(heatShelterConflict.identityConflicts.length, 1);
const heatShelterConflictAudit = auditHeatShelterFacilities(
  2,
  1,
  heatShelterConflict,
  heatShelterConflict.facilities,
  2,
);
assert.throws(() => assertHeatShelterAudit(heatShelterConflictAudit), /manual review/);

assert.equal(
  normalizeOptionalHeatShelterHours("N", { days: "", start: "", end: "" }, "extended"),
  undefined,
);
assert.deepEqual(
  normalizeOptionalHeatShelterHours(
    "Y",
    { days: "월,화,수,목,금", start: "18:00", end: "20:00" },
    "extended",
  ),
  { days: ["monday", "tuesday", "wednesday", "thursday", "friday"], start: "18:00", end: "20:00" },
);
assert.throws(
  () => normalizeOptionalHeatShelterHours("Y", { days: "월", start: "18:00", end: "" }, "extended"),
  /incomplete|missing/,
);
assert.equal(
  normalizeOptionalHeatShelterHours("N", { days: "", start: "", end: "" }, "additional"),
  undefined,
);
assert.deepEqual(
  normalizeOptionalHeatShelterHours("Y", { days: "토,일", start: "10:00", end: "24:00" }, "additional")?.days,
  ["saturday", "sunday"],
);
assert.throws(
  () => normalizeOptionalHeatShelterHours("Y", { days: "토", start: "10:00", end: "" }, "additional"),
  /incomplete|missing/,
);
assert.equal(
  normalizeHeatShelterHours({ days: "월", start: "09:00", end: "24:00" }, "regular")?.end,
  "24:00",
);
assert.throws(() => normalizeHeatShelterHours({ days: "월", start: "25:00", end: "24:00" }, "regular"));
assert.throws(() => normalizeHeatShelterHours({ days: "월,휴일", start: "09:00", end: "18:00" }, "regular"), /unknown weekday/);

const heatShelterDetail = createFacilityDetailViewModel(heatShelterTransform.facilities[0]);
assert.equal(heatShelterDetail.categoryLabel, "기타");
assert.equal(heatShelterDetail.subtypeLabel, "무더위쉼터");
assert.equal(heatShelterDetail.rows.some((row) => row.value === "회원이용시설"), true);
assert.equal(heatShelterDetail.rows.some((row) => row.label === "비고" && row.value === "확인 후 이용"), true);
assert.equal(heatShelterDetail.operatingHours[0].day.startsWith("기본 운영"), true);

assert.equal(
  classifyFireOrganizationSubtype("소방서", "양천소방서"),
  "FIRE_STATION",
);
assert.equal(
  classifyFireOrganizationSubtype("안전센터/구조대", "신월119안전센터"),
  "FIRE_SAFETY_CENTER",
);
assert.equal(
  classifyFireOrganizationSubtype("안전센터/구조대", "양천119구조대"),
  "FIRE_RESCUE_UNIT",
);
assert.throws(() =>
  classifyFireOrganizationSubtype("안전센터/구조대", "알 수 없는 조직"),
);

const convertedFireOrgCoordinate = convertEpsg5186ToWgs84(
  185258.326,
  547617.617,
);
assert.ok(
  Math.abs(convertedFireOrgCoordinate.longitude - 126.833225) < 0.000001,
);
assert.ok(
  Math.abs(convertedFireOrgCoordinate.latitude - 37.527935) < 0.000001,
);

const otherMergeFixture = (id: string) => ({ id });
assert.deepEqual(
  mergeOtherFacilitiesByIdPrefix(
    [
      otherMergeFixture("heat-shelter:2"),
      otherMergeFixture("fire-org:old"),
      otherMergeFixture("heat-shelter:1"),
    ],
    [otherMergeFixture("fire-org:new")],
    "fire-org:",
  ),
  [
    otherMergeFixture("fire-org:new"),
    otherMergeFixture("heat-shelter:1"),
    otherMergeFixture("heat-shelter:2"),
  ],
);
assert.deepEqual(
  mergeOtherFacilitiesByIdPrefix(
    [otherMergeFixture("fire-org:kept"), otherMergeFixture("heat-shelter:kept"), otherMergeFixture("child-safety-house:old"), otherMergeFixture("future:kept")],
    [otherMergeFixture("child-safety-house:new")],
    "child-safety-house:",
  ),
  [otherMergeFixture("child-safety-house:new"), otherMergeFixture("fire-org:kept"), otherMergeFixture("future:kept"), otherMergeFixture("heat-shelter:kept")],
);
assert.throws(() =>
  mergeOtherFacilitiesByIdPrefix(
    [],
    [otherMergeFixture("wrong:new")],
    "fire-org:",
  ),
);
assert.deepEqual(
  mergeOtherFacilitiesByIdPrefix(
    [
      otherMergeFixture("fire-org:kept"),
      otherMergeFixture("heat-shelter:old"),
      otherMergeFixture("future:kept"),
    ],
    [otherMergeFixture("heat-shelter:new")],
    "heat-shelter:",
  ),
  [
    otherMergeFixture("fire-org:kept"),
    otherMergeFixture("future:kept"),
    otherMergeFixture("heat-shelter:new"),
  ],
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

const existingCompositeMetadata: DataMetadata = {
  ...existingMetadata,
  sources: {
    ...existingMetadata.sources,
    other: {
      count: 2,
      datasets: {
        fireOrg: {
          count: 1,
          source: "old fire source",
          fetchedAt: "2026-09-16T03:00:00.000Z",
        },
        futureSource: {
          count: 1,
          source: "future source",
          fetchedAt: "2026-09-16T04:00:00.000Z",
        },
      },
    },
  },
};
const updatedOtherMetadata = updateOtherDatasetMetadata(
  existingCompositeMetadata,
  "fireOrg",
  {
    count: 2,
    source: "new fire source",
    fetchedAt: "2026-09-18T03:00:00.000Z",
  },
  {
    totalCount: 3,
    publishedDataChanged: true,
    generatedAt: "2026-09-18T05:00:00.000Z",
  },
);
assert.equal(updatedOtherMetadata.sources.other.count, 3);
assert.equal(
  updatedOtherMetadata.sources.other.datasets?.futureSource?.count,
  1,
);
assert.equal(updatedOtherMetadata.sources.other.datasets?.fireOrg?.count, 2);
const heatShelterMetadata = updateOtherDatasetMetadata(
  updatedOtherMetadata,
  "heatShelter",
  {
    count: 1,
    source: "서울시 무더위쉼터",
    fetchedAt: "2026-09-18T06:00:00.000Z",
  },
  {
    totalCount: 4,
    publishedDataChanged: true,
    generatedAt: "2026-09-18T06:30:00.000Z",
  },
);
assert.equal(heatShelterMetadata.sources.other.count, 4);
assert.equal(
  Object.values(heatShelterMetadata.sources.other.datasets ?? {}).reduce(
    (total, dataset) => total + dataset.count,
    0,
  ),
  4,
);
const childSafetyHouseMetadata = updateOtherDatasetMetadata(
  heatShelterMetadata,
  "childSafetyHouse",
  {
    count: 1,
    source: "경찰청 안전Dream 아동안전지킴이집",
    fetchedAt: "2026-09-18T07:00:00.000Z",
  },
  { totalCount: 5, publishedDataChanged: true },
);
assert.equal(childSafetyHouseMetadata.sources.other.count, 5);
assert.equal(
  Object.values(childSafetyHouseMetadata.sources.other.datasets ?? {}).reduce(
    (total, dataset) => total + dataset.count,
    0,
  ),
  5,
);
assert.equal(
  metadataSchema.safeParse({
    ...existingCompositeMetadata,
    sources: {
      ...existingCompositeMetadata.sources,
      other: {
        count: 3,
        datasets: existingCompositeMetadata.sources.other.datasets,
      },
    },
  }).success,
  false,
);

assert.equal(normalizeAedTime("0000", "start"), "0000");
assert.equal(normalizeAedTime("2500", "end"), "2500");
assert.throws(() => normalizeAedTime("2400", "start"));
assert.throws(() => normalizeAedTime("2460", "end"));
assert.throws(() => normalizeAedTime("2501", "end"));
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
assert.deepEqual(resolveMobilityDecision(candidateInput), {
  isCandidate: true,
  reasons: ["buildPlace contains 순찰차"],
  reviewed: false,
  status: "PENDING",
});
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
    status: "REVIEWED_FIXED",
  },
);
assert.deepEqual(
  resolveMobilityDecision({
    sourceId: "fixed-1",
    org: "고정 시설",
    buildAddress: "서울특별시 양천구 신월동",
  }),
  {
    isCandidate: false,
    reasons: [],
    mobility: "FIXED",
    reviewed: false,
    status: "AUTO_FIXED",
  },
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

const parsedAedSourceRow = aedSourceRowSchema.parse({
  serialSeq: "privacy-1",
  org: "개인정보 제거 검증",
  buildAddress: "서울특별시 양천구 신월동",
  wgs84Lat: "37.52",
  wgs84Lon: "126.84",
  manager: "제거 대상",
  managerTel: "제거 대상",
});
assert.equal(Object.hasOwn(parsedAedSourceRow, "manager"), false);
assert.equal(Object.hasOwn(parsedAedSourceRow, "managerTel"), false);

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

const createAedFixture = (
  sourceId: string,
  buildPlace: string,
) => ({
  serialSeq: sourceId,
  org: "AED 검증 기관",
  buildAddress: "서울특별시 양천구 신월동 1",
  buildPlace,
  clerkTel: "02-1234-5678",
  wgs84Lat: "37.52",
  wgs84Lon: "126.84",
  mfg: "검증 제조사",
  model: "검증 모델",
});

const autoFixedTransform = transformAedRows(
  [createAedFixture("AUTO-1", "건물 1층 로비")],
  { schemaVersion: 1, decisions: [] },
);
assert.equal(autoFixedTransform.autoFixed, 1);
assert.equal(autoFixedTransform.facilities.length, 1);
assert.equal(autoFixedTransform.pendingCandidates.length, 0);

const pendingTransform = transformAedRows(
  [createAedFixture("NEW-1", "구급차 내부")],
  { schemaVersion: 1, decisions: [] },
);
assert.equal(pendingTransform.autoFixed, 0);
assert.equal(pendingTransform.facilities.length, 0);
assert.deepEqual(
  pendingTransform.pendingCandidates.map((candidate) => candidate.sourceId),
  ["NEW-1"],
);
const pendingSnapshot = createAedPendingReview(
  pendingTransform.pendingCandidates,
);
assert.equal(aedPendingReviewSchema.safeParse(pendingSnapshot).success, true);
assert.equal(Object.hasOwn(pendingSnapshot, "generatedAt"), false);
assert.deepEqual(
  findSourceIdOverlap(
    pendingSnapshot.candidates.map((candidate) => candidate.sourceId),
    pendingTransform.facilities.map((facility) => facility.sourceId),
  ),
  [],
);

const pendingWorkflowTransform = transformAedRows(
  [
    createAedFixture("AUTO-2", "건물 안내데스크"),
    createAedFixture("NEW-1", "구급차 내부"),
  ],
  { schemaVersion: 1, decisions: [] },
);
const pendingWorkflowAudit = auditAedFacilities(
  pendingWorkflowTransform.facilities,
  2,
  1,
  pendingWorkflowTransform,
);
assert.doesNotThrow(() => assertAedAudit(pendingWorkflowAudit));
assert.equal(pendingWorkflowAudit.mobility.pendingReview, 1);
assert.equal(pendingWorkflowAudit.publishedRows, 1);

const reviewedFixedTransform = transformAedRows(
  [createAedFixture("NEW-1", "구급차 내부")],
  {
    schemaVersion: 1,
    decisions: [{ sourceId: "NEW-1", mobility: "FIXED" }],
  },
);
assert.equal(reviewedFixedTransform.reviewedFixed, 1);
assert.equal(reviewedFixedTransform.pendingCandidates.length, 0);
assert.deepEqual(
  reviewedFixedTransform.facilities.map((facility) => facility.sourceId),
  ["NEW-1"],
);

const reviewedMobileTransform = transformAedRows(
  [createAedFixture("NEW-1", "구급차 내부")],
  {
    schemaVersion: 1,
    decisions: [{ sourceId: "NEW-1", mobility: "MOBILE" }],
  },
);
assert.equal(reviewedMobileTransform.reviewedMobile, 1);
assert.equal(reviewedMobileTransform.pendingCandidates.length, 0);
assert.equal(reviewedMobileTransform.facilities.length, 0);
assert.deepEqual(
  findSourceIdOverlap(
    ["NEW-1"],
    reviewedMobileTransform.facilities.map((facility) => facility.sourceId),
  ),
  [],
);

const duplicatePendingCandidate = {
  sourceId: "PENDING-1",
  org: "검토 기관",
  address: "서울특별시 양천구 신월동",
  reasons: ["buildPlace contains 구급차"],
};
assert.deepEqual(
  createAedPendingReview([
    { ...duplicatePendingCandidate, sourceId: "PENDING-2" },
    duplicatePendingCandidate,
  ]).candidates.map((candidate) => candidate.sourceId),
  ["PENDING-1", "PENDING-2"],
);
assert.equal(
  aedPendingReviewSchema.safeParse({
    schemaVersion: 1,
    candidates: [duplicatePendingCandidate, duplicatePendingCandidate],
  }).success,
  false,
);

console.log("Data utility tests passed");
