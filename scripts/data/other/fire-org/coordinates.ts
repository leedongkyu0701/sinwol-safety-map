import proj4 from "proj4";

import { assertSeoulCoordinate } from "../../../../src/shared/lib/validation";
import {
  EPSG_5186_DEFINITION,
  FIRE_ORG_SOURCE_CRS,
} from "./constants";

proj4.defs(FIRE_ORG_SOURCE_CRS, EPSG_5186_DEFINITION);

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function convertEpsg5186ToWgs84(
  x: number,
  y: number,
): { latitude: number; longitude: number } {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error("EPSG:5186 coordinates must be finite");
  }

  const [rawLongitude, rawLatitude] = proj4(
    FIRE_ORG_SOURCE_CRS,
    "EPSG:4326",
    [x, y],
  );
  const latitude = roundCoordinate(rawLatitude);
  const longitude = roundCoordinate(rawLongitude);

  assertSeoulCoordinate(latitude, longitude);

  return { latitude, longitude };
}
