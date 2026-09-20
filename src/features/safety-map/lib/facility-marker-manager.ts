import { createFacilityMarkerIcons } from "@/features/safety-map/config/marker-config";
import type { Facility, FacilityCategory } from "@/shared/types/facility";

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
    private readonly map: naver.maps.Map,
    private readonly onMarkerClick: (facilityId: string) => void,
  ) {}

  mount(
    facilities: readonly Facility[],
    visibleCategories: ReadonlySet<FacilityCategory>,
  ): void {
    this.clear();

    try {
      for (const facility of facilities) {
        if (this.entries.has(facility.id)) {
          throw new Error(`Duplicate marker id: ${facility.id}`);
        }

        const visible = visibleCategories.has(facility.category);
        const marker = new naver.maps.Marker({
          map: visible ? this.map : undefined,
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

  setVisibleCategories(
    categories: ReadonlySet<FacilityCategory>,
  ): number {
    let visibleCount = 0;

    for (const entry of this.entries.values()) {
      const shouldBeVisible = categories.has(entry.facility.category);

      if (entry.visible !== shouldBeVisible) {
        entry.marker.setMap(shouldBeVisible ? this.map : null);
        entry.visible = shouldBeVisible;
      }

      if (shouldBeVisible) {
        visibleCount += 1;
      }
    }

    return visibleCount;
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
