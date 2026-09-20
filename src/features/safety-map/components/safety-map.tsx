"use client";

import { useMemo, useRef } from "react";

import { CategoryFilter } from "@/features/facilities/components/category-filter";
import { FacilityDetailPanel } from "@/features/facilities/components/facility-detail-panel";
import { useFacilities } from "@/features/facilities/hooks/use-facilities";
import { useFacilityExplorerStore } from "@/features/facilities/store/use-facility-explorer-store";
import { getVisibleFacilityCategories } from "@/features/facilities/types/facility-filter";
import { MapCanvas } from "@/features/safety-map/components/map-canvas";
import {
  SafetyMapStatusOverlay,
  type SafetyMapStatus,
} from "@/features/safety-map/components/safety-map-status-overlay";
import { useFacilityMarkers } from "@/features/safety-map/hooks/use-facility-markers";
import { useNaverMap } from "@/features/safety-map/hooks/use-naver-map";

interface SafetyMapDisplayState {
  status: SafetyMapStatus;
  message: string;
}

export function SafetyMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapState = useNaverMap(containerRef);
  const facilityState = useFacilities();
  const selectedCategory = useFacilityExplorerStore(
    (state) => state.selectedCategory,
  );
  const selectedFacilityId = useFacilityExplorerStore(
    (state) => state.selectedFacilityId,
  );
  const selectFacility = useFacilityExplorerStore(
    (state) => state.selectFacility,
  );
  const clearSelectedFacility = useFacilityExplorerStore(
    (state) => state.clearSelectedFacility,
  );
  const visibleCategories = getVisibleFacilityCategories(selectedCategory);
  const facilityById = useMemo(
    () =>
      new Map(
        facilityState.facilities.map((facility) => [
          facility.id,
          facility,
        ]),
      ),
    [facilityState.facilities],
  );
  const selectedFacility =
    selectedFacilityId === null
      ? null
      : (facilityById.get(selectedFacilityId) ?? null);
  const markerState = useFacilityMarkers({
    mapRef: mapState.mapRef,
    facilities: facilityState.facilities,
    visibleCategories,
    onMarkerClick: selectFacility,
    enabled:
      mapState.status === "ready" && facilityState.status === "ready",
  });

  let displayState: SafetyMapDisplayState;

  if (mapState.status === "error") {
    displayState = {
      status: "error",
      message: "지도를 불러오지 못했습니다.",
    };
  } else if (facilityState.status === "error") {
    displayState = {
      status: "error",
      message: "시설 데이터를 불러오지 못했습니다.",
    };
  } else if (markerState.status === "error") {
    displayState = {
      status: "error",
      message: "지도에 시설을 표시하지 못했습니다.",
    };
  } else if (mapState.status === "loading") {
    displayState = {
      status: "loading",
      message: "지도를 불러오는 중입니다.",
    };
  } else if (facilityState.status === "loading") {
    displayState = {
      status: "loading",
      message: "시설 데이터를 불러오는 중입니다.",
    };
  } else if (markerState.status !== "ready") {
    displayState = {
      status: "loading",
      message: "지도에 시설을 표시하는 중입니다.",
    };
  } else {
    displayState = { status: "ready", message: "" };
  }

  const interactionsReady = displayState.status === "ready";

  return (
    <section
      aria-label="신월동 공공 안전시설 지도"
      aria-busy={displayState.status === "loading"}
      data-facility-count={facilityState.facilities.length}
      data-marker-count={markerState.markerCount}
      data-visible-marker-count={markerState.visibleMarkerCount}
      data-selected-category={selectedCategory}
      className="relative h-full w-full overflow-hidden bg-zinc-100"
    >
      <MapCanvas containerRef={containerRef} />
      {interactionsReady ? <CategoryFilter /> : null}
      {interactionsReady && selectedFacility !== null ? (
        <FacilityDetailPanel
          facility={selectedFacility}
          onClose={clearSelectedFacility}
        />
      ) : null}
      <SafetyMapStatusOverlay {...displayState} />
    </section>
  );
}
