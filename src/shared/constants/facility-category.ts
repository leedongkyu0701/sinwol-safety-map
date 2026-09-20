import type { FacilityCategory } from "@/shared/types/facility";

interface FacilityCategoryConfig {
  label: string;
  iconPath: string;
}

export const FACILITY_CATEGORY_CONFIG = {
  FIRE_WATER: {
    label: "소방용수",
    iconPath: "/icons/facilities/fire-water.svg",
  },
  SHELTER: {
    label: "대피시설",
    iconPath: "/icons/facilities/shelter.svg",
  },
  AED: {
    label: "AED",
    iconPath: "/icons/facilities/aed.svg",
  },
  OTHER: {
    label: "기타",
    iconPath: "/icons/facilities/other.svg",
  },
} as const satisfies Record<FacilityCategory, FacilityCategoryConfig>;
