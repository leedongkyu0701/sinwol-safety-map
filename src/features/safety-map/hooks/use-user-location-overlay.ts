import { useEffect, type RefObject } from "react";

import type { UserLocation } from "@/features/current-location/types/user-location";

interface UseUserLocationOverlayOptions {
  mapRef: RefObject<naver.maps.Map | null>;
  userLocation: UserLocation | null;
  enabled: boolean;
}

const LOCATION_MARKER_SIZE = 24;

export function useUserLocationOverlay({
  mapRef,
  userLocation,
  enabled,
}: UseUserLocationOverlayOptions): void {
  useEffect(() => {
    if (!enabled || userLocation === null) {
      return;
    }

    const map = mapRef.current;

    if (map === null) {
      return;
    }

    const position = new naver.maps.LatLng(
      userLocation.latitude,
      userLocation.longitude,
    );
    const accuracyCircle = new naver.maps.Circle({
      map,
      center: position,
      radius: Math.max(1, userLocation.accuracy),
      strokeColor: "#1683ff",
      strokeOpacity: 0.45,
      strokeWeight: 1,
      fillColor: "#1683ff",
      fillOpacity: 0.14,
      clickable: false,
      zIndex: 50,
    });
    const locationMarker = new naver.maps.Marker({
      map,
      position,
      clickable: false,
      zIndex: 100,
      icon: {
        url: "/icons/map/current-location.svg",
        size: new naver.maps.Size(
          LOCATION_MARKER_SIZE,
          LOCATION_MARKER_SIZE,
        ),
        scaledSize: new naver.maps.Size(
          LOCATION_MARKER_SIZE,
          LOCATION_MARKER_SIZE,
        ),
        anchor: new naver.maps.Point(
          LOCATION_MARKER_SIZE / 2,
          LOCATION_MARKER_SIZE / 2,
        ),
      },
    });

    map.panTo(position);

    return () => {
      locationMarker.setMap(null);
      accuracyCircle.setMap(null);
    };
  }, [enabled, mapRef, userLocation]);
}
