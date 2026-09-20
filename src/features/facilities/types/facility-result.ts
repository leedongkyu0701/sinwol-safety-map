import type { Facility } from "@/shared/types/facility";

export interface FacilityResult {
  facility: Facility;
  distanceMeters?: number;
}
