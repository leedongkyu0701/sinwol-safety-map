import { createFacilityMarkerIcons } from "@/features/safety-map/config/marker-config";
import type { Facility } from "@/shared/types/facility";

interface MarkerEntry {
  facility: Facility;
  marker: naver.maps.Marker;
  clickListener: naver.maps.MapEventListener;
  visible: boolean;
}

export class FacilityMarkerManager {
  private readonly icons = createFacilityMarkerIcons();
  private readonly entries = new Map<string, MarkerEntry>();

  constructor(
    private readonly onMarkerClick: (facilityId: string) => void,
  ) {}

  mount(
    facilities: readonly Facility[],
    visibleFacilityIds: ReadonlySet<string>,
  ): void {
    this.clear();

    try {
      for (const facility of facilities) {
        if (this.entries.has(facility.id)) {
          throw new Error(`Duplicate marker id: ${facility.id}`);
        }

        const visible = visibleFacilityIds.has(facility.id);
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(
            facility.latitude,
            facility.longitude,
          ),
          icon: this.icons[facility.category],
          clickable: true,
          title: facility.name,
        });
        let clickListener: naver.maps.MapEventListener | null = null;

        try {
          clickListener = naver.maps.Event.addListener(
            marker,
            "click",
            () => this.onMarkerClick(facility.id),
          );

          this.entries.set(facility.id, {
            facility,
            marker,
            clickListener,
            visible,
          });
        } catch (error) {
          if (clickListener !== null) {
            naver.maps.Event.removeListener(clickListener);
          }

          marker.setMap(null);
          throw error;
        }
      }
    } catch (error) {
      this.clear();
      throw new Error("Failed to create the facility marker layer", {
        cause: error,
      });
    }
  }

  setVisibleFacilityIds(visibleFacilityIds: ReadonlySet<string>): number {
    let visibleCount = 0;

    for (const entry of this.entries.values()) {
      const shouldBeVisible = visibleFacilityIds.has(entry.facility.id);

      entry.visible = shouldBeVisible;

      if (shouldBeVisible) {
        visibleCount += 1;
      }
    }

    return visibleCount;
  }

  getVisibleMarkers(): naver.maps.Marker[] {
    return [...this.entries.values()]
      .filter((entry) => entry.visible)
      .map((entry) => entry.marker);
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      naver.maps.Event.removeListener(entry.clickListener);
      entry.marker.setMap(null);
    }

    this.entries.clear();
  }

  destroy(): void {
    this.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  get visibleSize(): number {
    let visibleCount = 0;

    for (const entry of this.entries.values()) {
      if (entry.visible) {
        visibleCount += 1;
      }
    }

    return visibleCount;
  }
}
