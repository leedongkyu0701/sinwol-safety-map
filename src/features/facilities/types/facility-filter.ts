import type { FacilityCategory } from "@/shared/types/facility";

export type FacilityCategoryFilter = "ALL" | FacilityCategory;

export const FACILITY_CATEGORY_FILTERS = [
  "ALL",
  "AED",
  "FIRE_WATER",
  "SHELTER",
  "OTHER",
] as const satisfies readonly FacilityCategoryFilter[];
