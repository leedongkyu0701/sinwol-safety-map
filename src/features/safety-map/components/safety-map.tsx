"use client";

import { useRef } from "react";

import { useFacilities } from "@/features/facilities/hooks/use-facilities";
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
  const markerState = useFacilityMarkers({
    mapRef: mapState.mapRef,
    facilities: facilityState.facilities,
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

  return (
    <section
      aria-label="신월동 공공 안전시설 지도"
      aria-busy={displayState.status === "loading"}
      data-facility-count={facilityState.facilities.length}
      data-marker-count={markerState.markerCount}
      className="relative h-full w-full overflow-hidden bg-zinc-100"
    >
      <MapCanvas containerRef={containerRef} />
      <SafetyMapStatusOverlay {...displayState} />
    </section>
  );
}
