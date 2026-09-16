export const SHELTER_API_BASE_URL = "http://openapi.seoul.go.kr:8088";
export const SHELTER_SERVICE_NAME = "LOCALDATA_114602";
export const SHELTER_OUTPUT_PATH = "public/data/shelters.json";
export const METADATA_OUTPUT_PATH = "public/data/metadata.json";

export const SHELTER_SOURCE_NAME = "서울시 민방위대피시설 인허가 정보";
export const SHELTER_SUBTYPE = "CIVIL_DEFENSE_SHELTER";
export const SHELTER_PAGE_SIZE = 1_000;
export const SHELTER_REQUEST_TIMEOUT_MS = 30_000;
export const SHELTER_MAX_COUNT_DECREASE_RATIO = 0.2;

export const YANGCHEON_ORGANIZATION_CODE = "3140000";
export const SHELTER_ACTIVE_STATUS = "사용중";
export const SHELTER_INACTIVE_STATUS = "사용중지";
export const SHELTER_KNOWN_STATUSES = [
  SHELTER_ACTIVE_STATUS,
  SHELTER_INACTIVE_STATUS,
] as const;

export const SHELTER_SOURCE_FIELDS = {
  districtCode: "OGDP_INST_CD",
  sourceId: "MNG_NO",
  status: "SALS_STTS_NM",
  lotAddress: "LOTNO_ADDR",
  roadAddress: "ROAD_NM_ADDR",
  name: "BPLC_NM",
  latitude: "XCRD",
  longitude: "YCRD",
} as const;

export const CURRENT_SHELTER_SNAPSHOT_BASELINE = {
  sourceRows: 3_412,
  yangcheonRows: 145,
  sinwolRows: 57,
  activeRows: 44,
  inactiveRows: 13,
  publishedRows: 44,
} as const;
