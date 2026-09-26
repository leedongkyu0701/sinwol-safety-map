export const CHILD_SAFETY_HOUSE_API_URL =
  "https://www.safe182.go.kr/api/lcm/safeMap.do";
export const CHILD_SAFETY_HOUSE_SOURCE_NAME =
  "경찰청 안전Dream 아동안전지킴이집";
export const CHILD_SAFETY_HOUSE_CLASS_CODE = "09";
export const CHILD_SAFETY_HOUSE_CLASS_NAME = "아동안전지킴이집";
export const CHILD_SAFETY_HOUSE_PAGE_SIZE = 100;
export const CHILD_SAFETY_HOUSE_REQUEST_TIMEOUT_MS = 30_000;
export const CHILD_SAFETY_HOUSE_ID_PREFIX = "child-safety-house:";
export const CHILD_SAFETY_HOUSE_METADATA_KEY = "childSafetyHouse";
export const CHILD_SAFETY_HOUSE_OUTPUT_PATH = "public/data/other.json";
export const CHILD_SAFETY_HOUSE_METADATA_PATH = "public/data/metadata.json";
export const CHILD_SAFETY_HOUSE_REFERENCE_PATH =
  "data/reference/child-safety-house.json";
export const CHILD_SAFETY_HOUSE_MAX_COUNT_DECREASE_RATIO = 0.2;
export const CHILD_SAFETY_HOUSE_CANDIDATE_ADDRESS_TOKEN = "양천구";
export const CHILD_SAFETY_HOUSE_DUPLICATE_COORDINATE_DISTANCE_METERS = 5;
export const CHILD_SAFETY_HOUSE_SNAPSHOT_BASELINE = {
  sourceRows: 10_725,
} as const;
