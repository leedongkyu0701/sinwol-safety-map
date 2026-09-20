import { createFacilityMarkerIcons } from "@/features/safety-map/config/marker-config";
import type { Facility } from "@/shared/types/facility";

export class FacilityMarkerManager {
  private readonly icons = createFacilityMarkerIcons();
  private readonly markers = new Map<string, naver.maps.Marker>();

  constructor(private readonly map: naver.maps.Map) {}

  mount(facilities: readonly Facility[]): void {
    this.clear();

    try {
      for (const facility of facilities) {
        if (this.markers.has(facility.id)) {
          throw new Error(`Duplicate marker id: ${facility.id}`);
        }

        const marker = new naver.maps.Marker({
          map: this.map,
          position: new naver.maps.LatLng(
            facility.latitude,
            facility.longitude,
          ),
          icon: this.icons[facility.category],
          clickable: false,
        });

        this.markers.set(facility.id, marker);
      }
    } catch (error) {
      this.clear();
      throw new Error("Failed to create the facility marker layer", {
        cause: error,
      });
    }
  }

  clear(): void {
    for (const marker of this.markers.values()) {
      marker.setMap(null);
    }

    this.markers.clear();
  }

  destroy(): void {
    this.clear();
  }

  get size(): number {
    return this.markers.size;
  }
}
