import {
  aedFacilitiesSchema,
  fireWaterFacilitiesSchema,
  otherFacilitiesSchema,
  shelterFacilitiesSchema,
} from "@/shared/schemas/facility";
import type { Facility, FacilityCategory } from "@/shared/types/facility";

interface RuntimeFacilitySchema {
  parse(input: unknown): Facility[];
}

export interface FacilityDatasetDefinition {
  category: FacilityCategory;
  url: string;
  schema: RuntimeFacilitySchema;
}

export const FACILITY_DATASETS = [
  {
    category: "FIRE_WATER",
    url: "/data/fire-water.json",
    schema: fireWaterFacilitiesSchema,
  },
  {
    category: "SHELTER",
    url: "/data/shelters.json",
    schema: shelterFacilitiesSchema,
  },
  {
    category: "AED",
    url: "/data/aeds.json",
    schema: aedFacilitiesSchema,
  },
  {
    category: "OTHER",
    url: "/data/other.json",
    schema: otherFacilitiesSchema,
  },
] as const satisfies readonly FacilityDatasetDefinition[];
