import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";
import type { FacilityCategory } from "@/shared/types/facility";

export const FACILITY_MARKER_SIZE = 32;
export const FACILITY_MARKER_ANCHOR = FACILITY_MARKER_SIZE / 2;

function createImageIcon(
  category: FacilityCategory,
  size: naver.maps.Size,
  anchor: naver.maps.Point,
): naver.maps.ImageIcon {
  return {
    url: FACILITY_CATEGORY_CONFIG[category].iconPath,
    size,
    scaledSize: size,
    origin: new naver.maps.Point(0, 0),
    anchor,
  };
}

export function createFacilityMarkerIcons(): Record<
  FacilityCategory,
  naver.maps.ImageIcon
> {
  const size = new naver.maps.Size(
    FACILITY_MARKER_SIZE,
    FACILITY_MARKER_SIZE,
  );
  const anchor = new naver.maps.Point(
    FACILITY_MARKER_ANCHOR,
    FACILITY_MARKER_ANCHOR,
  );

  return {
    FIRE_WATER: createImageIcon("FIRE_WATER", size, anchor),
    SHELTER: createImageIcon("SHELTER", size, anchor),
    AED: createImageIcon("AED", size, anchor),
    OTHER: createImageIcon("OTHER", size, anchor),
  };
}
