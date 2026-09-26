import type { UserLocation } from "@/features/current-location/types/user-location";
import { calculateHaversineDistance } from "@/features/facilities/lib/facility-distance";
import type { Facility } from "@/shared/types/facility";

export type EmergencyTarget = "AED" | "SHELTER";

export interface EmergencyFacilityResult {
  facility: Facility;
  distanceMeters: number;
}

function normalizeName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko");
}

export function getNearestEmergencyFacilities(
  facilities: readonly Facility[],
  target: EmergencyTarget,
  userLocation: UserLocation,
  limit = 3,
): EmergencyFacilityResult[] {
  const placeKeys = new Set<string>();
  const results: EmergencyFacilityResult[] = [];

  for (const facility of facilities) {
    if (facility.category !== target) continue;

    if (target === "AED") {
      const placeKey = `${normalizeName(facility.name)}\u0000${facility.latitude}\u0000${facility.longitude}`;
      if (placeKeys.has(placeKey)) continue;
      placeKeys.add(placeKey);
    }

    results.push({
      facility,
      distanceMeters: calculateHaversineDistance(userLocation, facility),
    });
  }

  results.sort((left, right) =>
    left.distanceMeters - right.distanceMeters ||
    left.facility.name.localeCompare(right.facility.name, "ko") ||
    left.facility.id.localeCompare(right.facility.id),
  );

  return results.slice(0, Math.max(0, limit));
}
