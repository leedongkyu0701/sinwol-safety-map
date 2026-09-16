export const FACILITY_CATEGORIES = [
  "FIRE_WATER",
  "SHELTER",
  "AED",
  "OTHER",
] as const;

export type FacilityCategory = (typeof FACILITY_CATEGORIES)[number];

export const FIRE_WATER_SUBTYPES = [
  "ABOVE_GROUND_HYDRANT",
  "UNDERGROUND_HYDRANT",
  "WATER_TOWER",
  "RESERVOIR",
  "RISING_HYDRANT",
  "EMERGENCY_FIRE_DEVICE",
] as const;

export type FireWaterSubtype = (typeof FIRE_WATER_SUBTYPES)[number];

export const FIRE_WATER_SUBTYPE_LABELS: Record<FireWaterSubtype, string> = {
  ABOVE_GROUND_HYDRANT: "지상식 소화전",
  UNDERGROUND_HYDRANT: "지하식 소화전",
  WATER_TOWER: "급수탑",
  RESERVOIR: "저수조",
  RISING_HYDRANT: "지하식 상승식 소화전",
  EMERGENCY_FIRE_DEVICE: "비상소화장치",
};

export interface BaseFacility {
  id: string;
  category: FacilityCategory;
  subtype: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  roadAddress?: string;
  lotAddress?: string;
  detailLocation?: string;
  source: string;
  sourceId: string;
}

export interface FireWaterFacility extends BaseFacility {
  category: "FIRE_WATER";
  subtype: FireWaterSubtype;
  details: {
    installedYear?: number;
    pressure?: number;
    safetyCenter?: string;
    fireStation?: string;
    fireStationPhone?: string;
  };
}

export interface ShelterFacility extends BaseFacility {
  category: "SHELTER";
  subtype: "CIVIL_DEFENSE_SHELTER";
  details: {
    status: "사용중";
  };
}

export const FACILITY_MOBILITIES = ["FIXED", "MOBILE"] as const;

export type FacilityMobility = (typeof FACILITY_MOBILITIES)[number];

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "holiday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface DailyHours {
  start?: string;
  end?: string;
}

export type OperatingHours = Partial<Record<DayOfWeek, DailyHours>>;

export interface AedFacility extends BaseFacility {
  category: "AED";
  details: {
    phone?: string;
    manufacturer?: string;
    model?: string;
    mobility: FacilityMobility;
    operatingHours?: OperatingHours;
  };
}

export interface OtherFacility extends BaseFacility {
  category: "OTHER";
  details: Record<string, never>;
}

export type Facility =
  | FireWaterFacility
  | ShelterFacility
  | AedFacility
  | OtherFacility;
