import { FACILITY_CLUSTER_CONFIG } from "@/features/safety-map/config/cluster-config";

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

    if (this.markers.length === 0) {
      return;
    }

    if (this.map.getZoom() >= this.config.maxZoom) {
      this.markers.forEach((marker) => marker.setMap(this.map));
      return;
    }

    const projection = this.map.getProjection();
    const buckets = new Map<string, naver.maps.Marker[]>();

    for (const marker of this.markers) {
      const position = marker.getPosition() as naver.maps.LatLng;
      const offset = projection.fromCoordToOffset(position);
      const bucketX = Math.floor(offset.x / this.config.gridSize);
      const bucketY = Math.floor(offset.y / this.config.gridSize);
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
        icon: {
          content: this.createClusterContent(bucket.length),
          size: this.getClusterSize(bucket.length),
          anchor: this.getClusterAnchor(bucket.length),
        },
        clickable: true,
        title: `${bucket.length}개 시설 확대`,
        zIndex: 200,
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

  private getClusterCenter(markers: readonly naver.maps.Marker[]): naver.maps.LatLng {
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

  private getClusterSize(count: number): naver.maps.Size {
    const size = count >= 100 ? 50 : count >= 10 ? 46 : 42;
    return new naver.maps.Size(size, size);
  }

  private getClusterAnchor(count: number): naver.maps.Point {
    const size = count >= 100 ? 50 : count >= 10 ? 46 : 42;
    return new naver.maps.Point(size / 2, size / 2);
  }

  private createClusterContent(count: number): HTMLDivElement {
    const content = document.createElement("div");
    content.textContent = String(count);
    content.style.alignItems = "center";
    content.style.background = "#172554";
    content.style.border = "3px solid #ffffff";
    content.style.borderRadius = "9999px";
    content.style.boxShadow = "0 3px 10px rgba(15, 23, 42, 0.28)";
    content.style.color = "#ffffff";
    content.style.display = "flex";
    content.style.fontSize = count >= 100 ? "15px" : "14px";
    content.style.fontWeight = "700";
    content.style.height = "100%";
    content.style.justifyContent = "center";
    content.style.width = "100%";
    return content;
  }
}
