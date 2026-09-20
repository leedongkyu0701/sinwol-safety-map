"use client";

import { useMemo, useRef, useState } from "react";

import { CategoryFilter } from "@/features/facilities/components/category-filter";
import { FacilitySearch } from "@/features/facilities/components/facility-search";
import { FacilitySidebar } from "@/features/facilities/components/facility-sidebar";
import { MobileFacilitySheet } from "@/features/facilities/components/mobile-facility-sheet";
import { useFacilities } from "@/features/facilities/hooks/use-facilities";
import { useFacilityResults } from "@/features/facilities/hooks/use-facility-results";
import { useFacilityExplorerStore } from "@/features/facilities/store/use-facility-explorer-store";
import { CurrentLocationButton } from "@/features/current-location/components/current-location-button";
import { CurrentLocationFeedback } from "@/features/current-location/components/current-location-feedback";
import { useCurrentLocation } from "@/features/current-location/hooks/use-current-location";
import { MapCanvas } from "@/features/safety-map/components/map-canvas";
import { SafetyMapLayout } from "@/features/safety-map/components/safety-map-layout";
import { SafetyMapHeader } from "@/features/safety-map/components/safety-map-header";
import {
  SafetyMapStatusOverlay,
  type SafetyMapStatus,
} from "@/features/safety-map/components/safety-map-status-overlay";
import { useFacilityMarkers } from "@/features/safety-map/hooks/use-facility-markers";
import { useNaverMap } from "@/features/safety-map/hooks/use-naver-map";
import { useUserLocationOverlay } from "@/features/safety-map/hooks/use-user-location-overlay";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import type { BottomSheetSnap } from "@/shared/ui/bottom-sheet";

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
  const searchQuery = useFacilityExplorerStore((state) => state.searchQuery);
  const selectFacility = useFacilityExplorerStore(
    (state) => state.selectFacility,
  );
  const clearSelectedFacility = useFacilityExplorerStore(
    (state) => state.clearSelectedFacility,
  );
  const currentLocation = useCurrentLocation();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mobileSheetSnap, setMobileSheetSnap] =
    useState<BottomSheetSnap>("peek");
  const handleSelectFacility = (facilityId: string) => {
    selectFacility(facilityId);
    setMobileSheetSnap("expanded");
  };
  const facilityResults = useFacilityResults({
    facilities: facilityState.facilities,
    selectedCategory,
    searchQuery,
    userLocation: currentLocation.location,
  });
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
    visibleFacilityIds: facilityResults.visibleFacilityIds,
    onMarkerClick: handleSelectFacility,
    enabled:
      mapState.status === "ready" && facilityState.status === "ready",
  });
  useUserLocationOverlay({
    mapRef: mapState.mapRef,
    userLocation: currentLocation.location,
    enabled: mapState.status === "ready",
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
      data-search-result-count={facilityResults.results.length}
      data-current-location-status={currentLocation.status}
      className="relative h-full w-full overflow-hidden bg-zinc-100"
    >
      <SafetyMapLayout
        desktopHeader={<SafetyMapHeader variant="desktop" />}
        mobileHeader={
          interactionsReady && !isDesktop ? (
            <SafetyMapHeader
              mobileSearch={
                <FacilitySearch
                  inputId="facility-search-mobile"
                  variant="compact"
                  onSearchStart={() => setMobileSheetSnap("expanded")}
                />
              }
              variant="mobile"
            />
          ) : null
        }
        sidebar={
          interactionsReady && isDesktop ? (
            <FacilitySidebar
              results={facilityResults.results}
              searchQuery={searchQuery}
              hasLocation={facilityResults.hasLocation}
              selectedFacility={selectedFacility}
              onSelect={handleSelectFacility}
              onBack={clearSelectedFacility}
            />
          ) : null
        }
        mapCanvas={<MapCanvas containerRef={containerRef} />}
        categoryFilter={interactionsReady ? <CategoryFilter /> : null}
        locationControl={
          interactionsReady ? (
            <div className="flex flex-col items-end gap-2">
              <CurrentLocationFeedback status={currentLocation.status} />
              <CurrentLocationButton
                status={currentLocation.status}
                onRequest={currentLocation.requestLocation}
              />
            </div>
          ) : null
        }
        mobileSheet={
          interactionsReady && !isDesktop ? (
            <MobileFacilitySheet
              results={facilityResults.results}
              searchQuery={searchQuery}
              hasLocation={facilityResults.hasLocation}
              selectedFacility={selectedFacility}
              onSelect={handleSelectFacility}
              onBack={clearSelectedFacility}
              snap={mobileSheetSnap}
              onSnapChange={setMobileSheetSnap}
            />
          ) : null
        }
        statusOverlay={<SafetyMapStatusOverlay {...displayState} />}
      />
    </section>
  );
}
