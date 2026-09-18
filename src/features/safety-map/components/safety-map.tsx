"use client";

import { useRef } from "react";

import { MapCanvas } from "@/features/safety-map/components/map-canvas";
import { MapStatusOverlay } from "@/features/safety-map/components/map-status-overlay";
import { useNaverMap } from "@/features/safety-map/hooks/use-naver-map";

export function SafetyMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { status } = useNaverMap(containerRef);

  return (
    <section
      aria-label="신월동 공공 안전시설 지도"
      className="relative h-full w-full overflow-hidden bg-zinc-100"
    >
      <MapCanvas containerRef={containerRef} />
      <MapStatusOverlay status={status} />
    </section>
  );
}
