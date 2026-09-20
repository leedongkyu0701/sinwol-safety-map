import type { FacilityCategory } from "@/shared/types/facility";

export const DATA_SOURCE_LINKS = {
  FIRE_WATER:
    "https://data.seoul.go.kr/dataList/OA-21306/A/1/datasetView.do",
  SHELTER:
    "https://data.seoul.go.kr/dataList/OA-16149/A/1/datasetView.do",
  AED: "https://www.data.go.kr/data/15021103/standard.do",
  OTHER: "https://data.seoul.go.kr/dataList/OA-21072/S/1/datasetView.do",
} as const satisfies Record<FacilityCategory, string>;
