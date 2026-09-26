import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";
import type { FacilityCategory } from "@/shared/types/facility";

export const FACILITY_MARKER_SIZE = 32;
export const FACILITY_MARKER_ANCHOR = FACILITY_MARKER_SIZE / 2;
export const SELECTED_FACILITY_MARKER_SIZE = 42;
export const SELECTED_FACILITY_MARKER_ANCHOR =
  SELECTED_FACILITY_MARKER_SIZE / 2;

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

export function createSelectedFacilityMarkerIcons(): Record<
  FacilityCategory,
  naver.maps.HtmlIcon
> {
  const size = SELECTED_FACILITY_MARKER_SIZE;
  const anchor = new naver.maps.Point(
    SELECTED_FACILITY_MARKER_ANCHOR,
    SELECTED_FACILITY_MARKER_ANCHOR,
  );

  return {
    FIRE_WATER: createSelectedImageIcon("FIRE_WATER", size, anchor),
    SHELTER: createSelectedImageIcon("SHELTER", size, anchor),
    AED: createSelectedImageIcon("AED", size, anchor),
    OTHER: createSelectedImageIcon("OTHER", size, anchor),
  };
}

function createSelectedImageIcon(
  category: FacilityCategory,
  size: number,
  anchor: naver.maps.Point,
): naver.maps.HtmlIcon {
  const imagePath = FACILITY_CATEGORY_CONFIG[category].iconPath;

  return {
    content: `<div aria-hidden="true" style="box-sizing:border-box;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border:3px solid #1683ff;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.3);"><img src="${imagePath}" alt="" draggable="false" style="display:block;width:32px;height:32px;max-width:none;max-height:none;" /></div>`,
    size: new naver.maps.Size(size, size),
    anchor,
  };
}
