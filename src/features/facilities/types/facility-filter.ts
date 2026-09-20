import {
  FACILITY_CATEGORIES,
  type FacilityCategory,
} from "@/shared/types/facility";

export type FacilityCategoryFilter = "ALL" | FacilityCategory;

export const FACILITY_CATEGORY_FILTERS = [
  "ALL",
  ...FACILITY_CATEGORIES,
] as const satisfies readonly FacilityCategoryFilter[];
