export const AED_API_BASE_URL =
  "https://apis.data.go.kr/B552657/AEDInfoInqireService";
export const AED_API_ENDPOINT = "getEgytAedManageInfoInqire";
export const AED_OUTPUT_PATH = "public/data/aeds.json";
export const AED_REVIEW_PATH = "data/review/aed-mobility.json";
export const AED_PENDING_REVIEW_PATH =
  "data/review/aed-mobility-pending.json";
export const METADATA_OUTPUT_PATH = "public/data/metadata.json";

export const AED_SOURCE_NAME =
  "국립중앙의료원 전국 자동심장충격기(AED) 정보 조회 서비스";
export const AED_PAGE_SIZE = 100;
export const AED_REQUEST_TIMEOUT_MS = 30_000;
export const AED_MAX_COUNT_DECREASE_RATIO = 0.2;

export const AED_QUERY_REGION = {
  province: "서울특별시",
  district: "양천구",
} as const;

export const AED_SOURCE_FIELDS = {
  sourceId: "serialSeq",
  name: "org",
  address: "buildAddress",
  detailLocation: "buildPlace",
  phone: "clerkTel",
  latitude: "wgs84Lat",
  longitude: "wgs84Lon",
  manufacturer: "mfg",
  model: "model",
} as const;

export const CURRENT_AED_SNAPSHOT_BASELINE = {
  apiRows: 416,
  sinwolRows: 112,
} as const;
