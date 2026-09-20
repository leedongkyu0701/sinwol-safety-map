import { useEffect, useRef, useState, type RefObject } from "react";

import { FacilityMarkerManager } from "@/features/safety-map/lib/facility-marker-manager";
import type { Facility } from "@/shared/types/facility";

export type FacilityMarkerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

interface FacilityMarkerState {
  status: Exclude<FacilityMarkerStatus, "idle">;
  error: Error | null;
  markerCount: number;
}

interface UseFacilityMarkersOptions {
  mapRef: RefObject<naver.maps.Map | null>;
  facilities: readonly Facility[];
  enabled: boolean;
}

interface UseFacilityMarkersResult {
  status: FacilityMarkerStatus;
  error: Error | null;
  markerCount: number;
}

const INITIAL_STATE: FacilityMarkerState = {
  status: "loading",
  error: null,
  markerCount: 0,
};

export function useFacilityMarkers({
  mapRef,
  facilities,
  enabled,
}: UseFacilityMarkersOptions): UseFacilityMarkersResult {
  const managerRef = useRef<FacilityMarkerManager | null>(null);
  const [state, setState] = useState<FacilityMarkerState>(INITIAL_STATE);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    let manager: FacilityMarkerManager | null = null;

    const frame = requestAnimationFrame(() => {
      try {
        const map = mapRef.current;

        if (map === null) {
          throw new Error("NAVER Map instance is not available.");
        }

        manager = new FacilityMarkerManager(map);
        managerRef.current = manager;
        manager.mount(facilities);

        if (active) {
          setState({
            status: "ready",
            error: null,
            markerCount: manager.size,
          });
        }
      } catch (error) {
        manager?.destroy();
        managerRef.current = null;

        const markerError =
          error instanceof Error
            ? error
            : new Error("Unknown facility marker error.");

        console.error(
          "[SafetyMap] Facility marker creation failed.",
          markerError,
        );

        if (active) {
          setState({ status: "error", error: markerError, markerCount: 0 });
        }
      }
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      manager?.destroy();

      if (managerRef.current === manager) {
        managerRef.current = null;
      }
    };
  }, [enabled, facilities, mapRef]);

  if (!enabled) {
    return { status: "idle", error: null, markerCount: 0 };
  }

  return state;
}
