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
  start: string;
  end: string;
}

export type OperatingHours = Partial<Record<DayOfWeek, DailyHours>>;

export interface AedFacility extends BaseFacility {
  category: "AED";
  subtype: "AED";
  details: {
    phone?: string;
    manufacturer?: string;
    model?: string;
    mobility: "FIXED";
    operatingHours?: OperatingHours;
  };
}

export const FIRE_ORGANIZATION_SUBTYPES = [
  "FIRE_STATION",
  "FIRE_SAFETY_CENTER",
  "FIRE_RESCUE_UNIT",
] as const;

export type FireOrganizationSubtype =
  (typeof FIRE_ORGANIZATION_SUBTYPES)[number];

export const HEAT_SHELTER_SUBTYPE = "HEAT_SHELTER" as const;
export const CHILD_SAFETY_HOUSE_SUBTYPE = "CHILD_SAFETY_HOUSE" as const;

export const HEAT_SHELTER_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type HeatShelterDay = (typeof HEAT_SHELTER_DAYS)[number];

export interface HeatShelterOperatingPeriod {
  days: HeatShelterDay[];
  start: string;
  end: string;
}

export interface FireOrganizationFacility extends BaseFacility {
  category: "OTHER";
  subtype: FireOrganizationSubtype;
  details: Record<string, never>;
}

export interface HeatShelterFacility extends BaseFacility {
  category: "OTHER";
  subtype: typeof HEAT_SHELTER_SUBTYPE;
  details: {
    facilityType1: string;
    facilityType2: string;
    regularHours?: HeatShelterOperatingPeriod;
    extendedHours?: HeatShelterOperatingPeriod;
    additionalHours?: HeatShelterOperatingPeriod;
    remarks?: string;
  };
}

export interface ChildSafetyHouseFacility extends BaseFacility {
  category: "OTHER";
  subtype: typeof CHILD_SAFETY_HOUSE_SUBTYPE;
  details: {
    phone?: string;
  };
}

export type OtherFacility =
  | FireOrganizationFacility
  | HeatShelterFacility
  | ChildSafetyHouseFacility;

export type Facility =
  | FireWaterFacility
  | ShelterFacility
  | AedFacility
  | OtherFacility;
