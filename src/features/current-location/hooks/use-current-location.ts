"use client";

import { useCallback, useState } from "react";

import type {
  CurrentLocationStatus,
  UserLocation,
} from "@/features/current-location/types/user-location";

interface CurrentLocationState {
  status: CurrentLocationStatus;
  location: UserLocation | null;
}

interface UseCurrentLocationResult extends CurrentLocationState {
  requestLocation: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 30_000,
};

function mapGeolocationError(error: GeolocationPositionError): CurrentLocationStatus {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "denied";
    case error.POSITION_UNAVAILABLE:
      return "unavailable";
    case error.TIMEOUT:
      return "timeout";
    default:
      return "error";
  }
}

export function useCurrentLocation(): UseCurrentLocationResult {
  const [state, setState] = useState<CurrentLocationState>({
    status: "idle",
    location: null,
  });

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "unavailable", location: null });
      return;
    }

    setState((current) => ({
      status: "requesting",
      location: current.location,
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "ready",
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
      },
      (error) => {
        setState({ status: mapGeolocationError(error), location: null });
      },
      GEOLOCATION_OPTIONS,
    );
  }, []);

  return { ...state, requestLocation };
}
