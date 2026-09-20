export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type CurrentLocationStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unavailable"
  | "timeout"
  | "error";
