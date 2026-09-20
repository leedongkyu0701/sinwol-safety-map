import {
  FACILITY_CATEGORIES,
  type FacilityCategory,
} from "@/shared/types/facility";

export type FacilityCategoryFilter = "ALL" | FacilityCategory;

export const FACILITY_CATEGORY_FILTERS = [
  "ALL",
  ...FACILITY_CATEGORIES,
] as const satisfies readonly FacilityCategoryFilter[];

const ALL_VISIBLE_CATEGORIES = new Set<FacilityCategory>(
  FACILITY_CATEGORIES,
);

const VISIBLE_CATEGORIES_BY_FILTER: Record<
  FacilityCategoryFilter,
  ReadonlySet<FacilityCategory>
> = {
  ALL: ALL_VISIBLE_CATEGORIES,
  FIRE_WATER: new Set(["FIRE_WATER"]),
  SHELTER: new Set(["SHELTER"]),
  AED: new Set(["AED"]),
  OTHER: new Set(["OTHER"]),
};

export function getVisibleFacilityCategories(
  filter: FacilityCategoryFilter,
): ReadonlySet<FacilityCategory> {
  return VISIBLE_CATEGORIES_BY_FILTER[filter];
}
