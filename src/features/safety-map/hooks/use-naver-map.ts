import { useEffect, useRef, useState, type RefObject } from "react";

import {
  DEFAULT_MAP_ZOOM,
  MIN_MAP_ZOOM,
  SINWOL_MAP_BOUNDS,
  SINWOL_MAP_CENTER,
} from "@/features/safety-map/config/map-config";
import {
  getNaverMapAuthFailureError,
  loadNaverMaps,
  NAVER_MAP_AUTH_FAILURE_EVENT,
} from "@/features/safety-map/lib/load-naver-maps";

export type NaverMapStatus = "loading" | "ready" | "error";

interface NaverMapState {
  status: NaverMapStatus;
  error: Error | null;
}

interface UseNaverMapResult extends NaverMapState {
  mapRef: RefObject<naver.maps.Map | null>;
}

const INITIAL_STATE: NaverMapState = {
  status: "loading",
  error: null,
};

export function useNaverMap(
  containerRef: RefObject<HTMLDivElement | null>,
): UseNaverMapResult {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [state, setState] = useState<NaverMapState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame: number | null = null;

    const destroyMap = () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = null;
      }

      resizeObserver?.disconnect();
      resizeObserver = null;
      mapRef.current?.destroy();
      mapRef.current = null;
    };

    const reportError = (error: unknown) => {
      const mapError =
        error instanceof Error
          ? error
          : new Error("Unknown NAVER Maps initialization error.");

      console.error("[SafetyMap] NAVER Map initialization failed.", mapError);

      if (active) {
        destroyMap();
        setState({ status: "error", error: mapError });
      }
    };

    const handleAuthFailure = () => {
      reportError(
        getNaverMapAuthFailureError() ??
          new Error("NAVER Maps authentication failed."),
      );
    };

    window.addEventListener(
      NAVER_MAP_AUTH_FAILURE_EVENT,
      handleAuthFailure,
    );

    const initializeMap = async () => {
      try {
        await loadNaverMaps();

        if (!active) {
          return;
        }

        const container = containerRef.current;

        if (container === null) {
          throw new Error("NAVER Map container is not available.");
        }

        const maxBounds = new naver.maps.LatLngBounds(
          new naver.maps.LatLng(
            SINWOL_MAP_BOUNDS.southWest.latitude,
            SINWOL_MAP_BOUNDS.southWest.longitude,
          ),
          new naver.maps.LatLng(
            SINWOL_MAP_BOUNDS.northEast.latitude,
            SINWOL_MAP_BOUNDS.northEast.longitude,
          ),
        );

        const map = new naver.maps.Map(container, {
          center: new naver.maps.LatLng(
            SINWOL_MAP_CENTER.latitude,
            SINWOL_MAP_CENTER.longitude,
          ),
          mapTypeId: naver.maps.MapTypeId.NORMAL,
          maxBounds,
          minZoom: MIN_MAP_ZOOM,
          scaleControl: true,
          zoom: DEFAULT_MAP_ZOOM,
          zoomControl: true,
          zoomControlOptions: {
            position: naver.maps.Position.RIGHT_CENTER,
          },
        });

        mapRef.current = map;
        resizeObserver = new ResizeObserver(() => {
          if (resizeFrame !== null) {
            cancelAnimationFrame(resizeFrame);
          }

          resizeFrame = requestAnimationFrame(() => {
            mapRef.current?.autoResize();
            resizeFrame = null;
          });
        });
        resizeObserver.observe(container);
        setState({ status: "ready", error: null });
      } catch (error) {
        reportError(error);
      }
    };

    void initializeMap();

    return () => {
      active = false;
      window.removeEventListener(
        NAVER_MAP_AUTH_FAILURE_EVENT,
        handleAuthFailure,
      );
      destroyMap();
    };
  }, [containerRef]);

  return { mapRef, ...state };
}
