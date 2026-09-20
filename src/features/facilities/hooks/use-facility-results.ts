import { useMemo } from "react";

import type { UserLocation } from "@/features/current-location/types/user-location";
import { calculateHaversineDistance } from "@/features/facilities/lib/facility-distance";
import {
  createFacilitySearchText,
  matchesFacilitySearch,
  tokenizeFacilitySearchQuery,
} from "@/features/facilities/lib/facility-search";
import type { FacilityCategoryFilter } from "@/features/facilities/types/facility-filter";
import type { FacilityResult } from "@/features/facilities/types/facility-result";
import type { Facility } from "@/shared/types/facility";

interface UseFacilityResultsOptions {
  facilities: readonly Facility[];
  selectedCategory: FacilityCategoryFilter;
  searchQuery: string;
  userLocation: UserLocation | null;
}

interface UseFacilityResultsResult {
  results: FacilityResult[];
  visibleFacilityIds: ReadonlySet<string>;
  hasLocation: boolean;
}

export function useFacilityResults({
  facilities,
  selectedCategory,
  searchQuery,
  userLocation,
}: UseFacilityResultsOptions): UseFacilityResultsResult {
  const searchIndex = useMemo(
    () =>
      new Map(
        facilities.map((facility) => [
          facility.id,
          createFacilitySearchText(facility),
        ]),
      ),
    [facilities],
  );

  return useMemo(() => {
    const tokens = tokenizeFacilitySearchQuery(searchQuery);
    const matchingFacilities = facilities.filter((facility) => {
      if (
        selectedCategory !== "ALL" &&
        facility.category !== selectedCategory
      ) {
        return false;
      }

      const searchableText = searchIndex.get(facility.id);
      return (
        searchableText !== undefined &&
        matchesFacilitySearch(searchableText, tokens)
      );
    });
    const results: FacilityResult[] = matchingFacilities.map((facility) =>
      userLocation === null
        ? { facility }
        : {
            facility,
            distanceMeters: calculateHaversineDistance(
              userLocation,
              facility,
            ),
          },
    );

    if (userLocation !== null) {
      results.sort((left, right) => {
        const distanceDifference =
          (left.distanceMeters ?? 0) - (right.distanceMeters ?? 0);

        return distanceDifference !== 0
          ? distanceDifference
          : left.facility.name.localeCompare(right.facility.name, "ko");
      });
    }

    return {
      results,
      visibleFacilityIds: new Set(
        matchingFacilities.map((facility) => facility.id),
      ),
      hasLocation: userLocation !== null,
    };
  }, [facilities, searchIndex, searchQuery, selectedCategory, userLocation]);
}
