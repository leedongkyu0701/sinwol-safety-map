export const HEAT_SHELTER_API_BASE_URL = "http://openapi.seoul.go.kr:8088";
export const HEAT_SHELTER_SERVICE_NAME = "TbGtnHwcwP";
export const HEAT_SHELTER_SOURCE_NAME = "서울시 무더위쉼터";
export const HEAT_SHELTER_PAGE_SIZE = 1_000;
export const HEAT_SHELTER_REQUEST_TIMEOUT_MS = 30_000;
export const HEAT_SHELTER_ID_PREFIX = "heat-shelter:";
export const HEAT_SHELTER_METADATA_KEY = "heatShelter";
export const OTHER_OUTPUT_PATH = "public/data/other.json";
export const METADATA_OUTPUT_PATH = "public/data/metadata.json";

export const SINWOL_HEAT_SHELTER_AREA_CODES = [
  "1147056000",
  "1147057000",
  "1147058000",
  "1147059000",
  "1147060000",
  "1147061000",
  "1147061100",
] as const;

export const SINWOL_HEAT_SHELTER_ADDRESS =
  "서울특별시 양천구 신월동";

export const CURRENT_HEAT_SHELTER_SNAPSHOT_BASELINE = {
  sourceRows: 4_092,
  selectedRows: 66,
} as const;

export const HEAT_SHELTER_MAX_COUNT_DECREASE_RATIO = 0.2;
