import { useEffect, useRef, useState, type RefObject } from "react";

import { FacilityClusterController } from "@/features/safety-map/lib/facility-cluster-controller";
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
  visibleMarkerCount: number;
}

interface UseFacilityMarkersOptions {
  mapRef: RefObject<naver.maps.Map | null>;
  facilities: readonly Facility[];
  visibleFacilityIds: ReadonlySet<string>;
  onMarkerClick: (facilityId: string) => void;
  selectedFacilityId: string | null;
  enabled: boolean;
}

interface UseFacilityMarkersResult {
  status: FacilityMarkerStatus;
  error: Error | null;
  markerCount: number;
  visibleMarkerCount: number;
}

const INITIAL_STATE: FacilityMarkerState = {
  status: "loading",
  error: null,
  markerCount: 0,
  visibleMarkerCount: 0,
};

export function useFacilityMarkers({
  mapRef,
  facilities,
  visibleFacilityIds,
  onMarkerClick,
  selectedFacilityId,
  enabled,
}: UseFacilityMarkersOptions): UseFacilityMarkersResult {
  const managerRef = useRef<FacilityMarkerManager | null>(null);
  const clusterControllerRef = useRef<FacilityClusterController | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const visibleFacilityIdsRef = useRef(visibleFacilityIds);
  const selectedFacilityIdRef = useRef(selectedFacilityId);
  const [state, setState] = useState<FacilityMarkerState>(INITIAL_STATE);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    visibleFacilityIdsRef.current = visibleFacilityIds;
  }, [visibleFacilityIds]);

  useEffect(() => {
    selectedFacilityIdRef.current = selectedFacilityId;
    managerRef.current?.setSelectedFacilityId(selectedFacilityId);
  }, [selectedFacilityId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    let manager: FacilityMarkerManager | null = null;
    let clusterController: FacilityClusterController | null = null;

    const frame = requestAnimationFrame(() => {
      try {
        const map = mapRef.current;

        if (map === null) {
          throw new Error("NAVER Map instance is not available.");
        }

        manager = new FacilityMarkerManager((facilityId) => {
          onMarkerClickRef.current(facilityId);
        });
        managerRef.current = manager;
        manager.mount(facilities, visibleFacilityIdsRef.current);
        manager.setSelectedFacilityId(selectedFacilityIdRef.current);
        clusterController = new FacilityClusterController(map);
        clusterControllerRef.current = clusterController;
        clusterController.setMarkers(manager.getVisibleMarkers());

        if (active) {
          setState({
            status: "ready",
            error: null,
            markerCount: manager.size,
            visibleMarkerCount: manager.visibleSize,
          });
        }
      } catch (error) {
        clusterController?.destroy();
        manager?.destroy();
        clusterControllerRef.current = null;
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
          setState({
            status: "error",
            error: markerError,
            markerCount: 0,
            visibleMarkerCount: 0,
          });
        }
      }
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      clusterController?.destroy();
      manager?.destroy();

      if (managerRef.current === manager) {
        managerRef.current = null;
      }
      if (clusterControllerRef.current === clusterController) {
        clusterControllerRef.current = null;
      }
    };
  }, [enabled, facilities, mapRef]);

  useEffect(() => {
    if (!enabled || state.status !== "ready") {
      return;
    }

    const manager = managerRef.current;

    if (manager === null) {
      return;
    }

    try {
      const visibleMarkerCount = manager.setVisibleFacilityIds(
        visibleFacilityIds,
      );
      clusterControllerRef.current?.setMarkers(manager.getVisibleMarkers());

      setState((current) =>
        current.visibleMarkerCount === visibleMarkerCount
          ? current
          : { ...current, visibleMarkerCount },
      );
    } catch (error) {
      clusterControllerRef.current?.destroy();
      clusterControllerRef.current = null;
      manager.destroy();
      managerRef.current = null;

      const markerError =
        error instanceof Error
          ? error
          : new Error("Unknown facility marker visibility error.");

      console.error(
        "[SafetyMap] Facility marker visibility update failed.",
        markerError,
      );
      setState({
        status: "error",
        error: markerError,
        markerCount: 0,
        visibleMarkerCount: 0,
      });
    }
  }, [enabled, state.status, visibleFacilityIds]);

  if (!enabled) {
    return {
      status: "idle",
      error: null,
      markerCount: 0,
      visibleMarkerCount: 0,
    };
  }

  return state;
}
