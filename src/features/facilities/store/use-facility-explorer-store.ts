"use client";

import { create } from "zustand";

import type { FacilityCategoryFilter } from "@/features/facilities/types/facility-filter";

interface FacilityExplorerState {
  selectedCategory: FacilityCategoryFilter;
  selectedFacilityId: string | null;
  setSelectedCategory: (category: FacilityCategoryFilter) => void;
  selectFacility: (facilityId: string) => void;
  clearSelectedFacility: () => void;
}

export const useFacilityExplorerStore = create<FacilityExplorerState>()(
  (set) => ({
    selectedCategory: "ALL",
    selectedFacilityId: null,
    setSelectedCategory: (category) => {
      set((state) =>
        state.selectedCategory === category
          ? state
          : { selectedCategory: category, selectedFacilityId: null },
      );
    },
    selectFacility: (facilityId) => {
      set((state) =>
        state.selectedFacilityId === facilityId
          ? state
          : { selectedFacilityId: facilityId },
      );
    },
    clearSelectedFacility: () => {
      set((state) =>
        state.selectedFacilityId === null
          ? state
          : { selectedFacilityId: null },
      );
    },
  }),
);
