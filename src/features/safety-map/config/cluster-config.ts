export const FACILITY_CLUSTER_CONFIG = {
  minClusterSize: 2,
  maxZoom: 17,
} as const;

const FACILITY_CLUSTER_GRID_POLICY = [
  { maxZoom: 14, gridSize: 80 },
  { maxZoom: 15, gridSize: 100 },
  { maxZoom: 16, gridSize: 120 },
] as const;

export function getFacilityClusterGridSize(zoom: number): number {
  return (
    FACILITY_CLUSTER_GRID_POLICY.find((policy) => zoom <= policy.maxZoom)
      ?.gridSize ?? 120
  );
}
