import {
  FACILITY_CLUSTER_CONFIG,
  getFacilityClusterGridSize,
} from "@/features/safety-map/config/cluster-config";
import { MAP_OVERLAY_Z_INDEX } from "@/features/safety-map/config/map-overlay-config";
import { createFacilityClusterIcon } from "@/features/safety-map/lib/create-facility-cluster-icon";

/**
 * This controller follows the grid-based presentation approach from
 * NAVER's official marker-tools.js marker-clustering reference:
 * https://github.com/navermaps/marker-tools.js/tree/master/marker-clustering
 *
 * The official reference is Apache License 2.0. This project implements a
 * small TypeScript adapter instead of redistributing the helper source.
 */
export class FacilityClusterController {
  private markers: naver.maps.Marker[] = [];
  private readonly clusterMarkers = new Map<
    string,
    { marker: naver.maps.Marker; listener: naver.maps.MapEventListener }
  >();
  private readonly idleListener: naver.maps.MapEventListener;

  constructor(
    private readonly map: naver.maps.Map,
    private readonly config = FACILITY_CLUSTER_CONFIG,
  ) {
    this.idleListener = naver.maps.Event.addListener(map, "idle", () => {
      this.redraw();
    });
  }

  setMarkers(markers: readonly naver.maps.Marker[]): void {
    this.clearPresentation();
    this.markers = [...markers];
    this.redraw();
  }

  destroy(): void {
    naver.maps.Event.removeListener(this.idleListener);
    this.clearPresentation();
    this.markers = [];
  }

  private redraw(): void {
    this.clearPresentation();

    const viewportMarkers = this.getViewportMarkers();

    if (viewportMarkers.length === 0) {
      return;
    }

    if (this.map.getZoom() >= this.config.maxZoom) {
      viewportMarkers.forEach((marker) => marker.setMap(this.map));
      return;
    }

    const projection = this.map.getProjection();
    const buckets = new Map<string, naver.maps.Marker[]>();
    const gridSize = getFacilityClusterGridSize(this.map.getZoom());

    for (const marker of viewportMarkers) {
      const position = marker.getPosition() as naver.maps.LatLng;
      const offset = projection.fromCoordToOffset(position);
      const bucketX = Math.floor(offset.x / gridSize);
      const bucketY = Math.floor(offset.y / gridSize);
      const key = `${bucketX}:${bucketY}`;
      const bucket = buckets.get(key);

      if (bucket === undefined) {
        buckets.set(key, [marker]);
      } else {
        bucket.push(marker);
      }
    }

    let index = 0;
    for (const bucket of buckets.values()) {
      if (bucket.length < this.config.minClusterSize) {
        bucket.forEach((marker) => marker.setMap(this.map));
        continue;
      }

      const center = this.getClusterCenter(bucket);
      const clusterMarker = new naver.maps.Marker({
        map: this.map,
        position: center,
        icon: createFacilityClusterIcon(bucket.length),
        clickable: true,
        title: `${bucket.length}개 시설 확대`,
        zIndex: MAP_OVERLAY_Z_INDEX.facilityCluster,
      });
      const listener = naver.maps.Event.addListener(
        clusterMarker,
        "click",
        () => {
          const nextZoom = Math.min(
            this.map.getZoom() + 1,
            this.map.getMaxZoom(),
          );
          this.map.morph(center, nextZoom);
        },
      );

      this.clusterMarkers.set(`${index}:${bucket.length}`, {
        marker: clusterMarker,
        listener,
      });
      index += 1;
    }
  }

  private clearPresentation(): void {
    for (const entry of this.clusterMarkers.values()) {
      naver.maps.Event.removeListener(entry.listener);
      entry.marker.setMap(null);
    }
    this.clusterMarkers.clear();

    for (const marker of this.markers) {
      marker.setMap(null);
    }
  }

  private getViewportMarkers(): naver.maps.Marker[] {
    const bounds = this.map.getBounds() as naver.maps.LatLngBounds;

    return this.markers.filter((marker) =>
      bounds.hasLatLng(marker.getPosition()),
    );
  }

  private getClusterCenter(
    markers: readonly naver.maps.Marker[],
  ): naver.maps.LatLng {
    let latitude = 0;
    let longitude = 0;

    for (const marker of markers) {
      const position = marker.getPosition() as naver.maps.LatLng;
      latitude += position.lat();
      longitude += position.lng();
    }

    return new naver.maps.LatLng(
      latitude / markers.length,
      longitude / markers.length,
    );
  }
}
