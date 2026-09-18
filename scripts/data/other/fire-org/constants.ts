export const FIRE_ORG_API_BASE_URL = "http://openapi.seoul.go.kr:8088";
export const FIRE_ORG_SERVICE_NAME = "TbGiWardP";
export const FIRE_ORG_SOURCE_NAME =
  "서울시 소방서 안전센터 구조대 위치정보";
export const FIRE_ORG_ADDRESS_SOURCE_NAME =
  "서울소방서 119안전센터 현황";

export const FIRE_ORG_REFERENCE_PATH = "data/reference/fire-org.json";
export const OTHER_OUTPUT_PATH = "public/data/other.json";
export const METADATA_OUTPUT_PATH = "public/data/metadata.json";
export const FIRE_ORG_METADATA_KEY = "fireOrg";
export const FIRE_ORG_ID_PREFIX = "fire-org:";

export const FIRE_ORG_PAGE_SIZE = 1_000;
export const FIRE_ORG_REQUEST_TIMEOUT_MS = 30_000;

export const FIRE_ORG_SOURCE_CRS = "EPSG:5186";
export const FIRE_ORG_SOURCE_CRS_NAME =
  "ITRF2000_MTM(TM20만60만, 중부원점)";
export const EPSG_5186_DEFINITION =
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs";

export const CURRENT_FIRE_ORG_SNAPSHOT_BASELINE = {
  sourceRows: 180,
  selectedRows: 1,
} as const;
