import type { FireWaterSubtype } from "../../../src/shared/types/facility";

export const FIRE_WATER_INPUT_PATH = "data/raw/fire-water/source.xlsx";
export const FIRE_WATER_OUTPUT_PATH = "public/data/fire-water.json";
export const METADATA_OUTPUT_PATH = "public/data/metadata.json";

export const FIRE_WATER_SHEET_NAME = "소방용수시설(서울)";
export const FIRE_WATER_SOURCE_NAME = "서울특별시 소방용수시설 현황";
export const FIRE_WATER_MAX_COUNT_DECREASE_RATIO = 0.2;

export const FIRE_WATER_SUBTYPE_BY_CODE = {
  "01": "ABOVE_GROUND_HYDRANT",
  "02": "UNDERGROUND_HYDRANT",
  "03": "WATER_TOWER",
  "04": "RESERVOIR",
  "05": "RISING_HYDRANT",
  "06": "EMERGENCY_FIRE_DEVICE",
} as const satisfies Record<string, FireWaterSubtype>;

export type FireWaterSourceCode = keyof typeof FIRE_WATER_SUBTYPE_BY_CODE;

export const SOURCE_HEADER_PREFIXES = {
  sourceId: "시설번호",
  typeCode: "시설유형코드",
  city: "시도명",
  district: "시군구명",
  roadAddress: "소재지도로명주소",
  lotAddress: "소재지지번주소",
  latitude: "위도",
  longitude: "경도",
  detailLocation: "상세위치",
  safetyCenter: "안전센터명",
  installedYear: "설치연도",
  pressure: "출수압력",
  fireStation: "관할소방서명",
  phone: "관할소방서전화번호",
  sourceUpdatedAt: "데이터기준일자",
} as const;

export const CURRENT_SNAPSHOT_BASELINE = {
  sourceRows: 62_771,
  yangcheonRows: 2_281,
  sinwolRows: 936,
  subtypeCounts: {
    ABOVE_GROUND_HYDRANT: 139,
    UNDERGROUND_HYDRANT: 779,
    WATER_TOWER: 0,
    RESERVOIR: 2,
    RISING_HYDRANT: 0,
    EMERGENCY_FIRE_DEVICE: 16,
  },
} as const;
