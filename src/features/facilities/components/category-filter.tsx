import Image from "next/image";

import {
  FACILITY_CATEGORY_FILTERS,
  type FacilityCategoryFilter,
} from "@/features/facilities/types/facility-filter";
import { useFacilityExplorerStore } from "@/features/facilities/store/use-facility-explorer-store";
import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";
import { cn } from "@/shared/lib/cn";

const ALL_FILTER_LABEL = "전체";

function getFilterLabel(filter: FacilityCategoryFilter): string {
  return filter === "ALL"
    ? ALL_FILTER_LABEL
    : FACILITY_CATEGORY_CONFIG[filter].label;
}

interface CategoryFilterProps {
  className?: string;
}

export function CategoryFilter({ className }: CategoryFilterProps) {
  const selectedCategory = useFacilityExplorerStore(
    (state) => state.selectedCategory,
  );
  const setSelectedCategory = useFacilityExplorerStore(
    (state) => state.setSelectedCategory,
  );

  return (
    <nav
      aria-label="시설 카테고리 필터"
      className={cn(
        "overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div className="flex w-max flex-nowrap gap-2 pr-2">
        {FACILITY_CATEGORY_FILTERS.map((filter) => {
          const isSelected = selectedCategory === filter;

          return (
            <button
              key={filter}
              type="button"
              aria-pressed={isSelected}
              data-category-filter={filter}
              onClick={() => setSelectedCategory(filter)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                isSelected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
              )}
            >
              {filter === "ALL" ? null : (
                <Image
                  src={FACILITY_CATEGORY_CONFIG[filter].iconPath}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                />
              )}
              <span>{getFilterLabel(filter)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
