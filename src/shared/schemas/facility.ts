import { z } from "zod";

import {
  DAYS_OF_WEEK,
  CHILD_SAFETY_HOUSE_SUBTYPE,
  FACILITY_CATEGORIES,
  FIRE_ORGANIZATION_SUBTYPES,
  FIRE_WATER_SUBTYPES,
  HEAT_SHELTER_DAYS,
  HEAT_SHELTER_SUBTYPE,
  type AedFacility,
  type Facility,
  type ChildSafetyHouseFacility,
  type FireOrganizationFacility,
  type FireWaterFacility,
  type HeatShelterFacility,
  type OtherFacility,
  type ShelterFacility,
} from "@/shared/types/facility";
import { isValidAedTime } from "@/shared/lib/operating-hours";
import {
  hasNamespacedId,
  type FacilityIdNamespace,
} from "@/shared/lib/validation";

const nonEmptyStringSchema = z.string().trim().min(1);

const latitudeSchema = z
  .number()
  .refine(Number.isFinite, "Latitude must be finite")
  .min(-90)
  .max(90)
  .min(37.3, "Latitude is outside the Seoul sanity range")
  .max(37.8, "Latitude is outside the Seoul sanity range");

const longitudeSchema = z
  .number()
  .refine(Number.isFinite, "Longitude must be finite")
  .min(-180)
  .max(180)
  .min(126.7, "Longitude is outside the Seoul sanity range")
  .max(127.3, "Longitude is outside the Seoul sanity range");

const baseFacilityShape = {
  id: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  address: nonEmptyStringSchema,
  roadAddress: nonEmptyStringSchema.optional(),
  lotAddress: nonEmptyStringSchema.optional(),
  detailLocation: nonEmptyStringSchema.optional(),
  source: nonEmptyStringSchema,
  sourceId: nonEmptyStringSchema,
};

function validateNamespacedId(
  namespace: FacilityIdNamespace,
  facility: { id: string; sourceId: string },
  context: z.RefinementCtx,
): void {
  if (!hasNamespacedId(namespace, facility.id, facility.sourceId)) {
    context.addIssue({
      code: "custom",
      path: ["id"],
      message: `Facility id must use the ${namespace} namespace`,
    });
  }
}

export const facilityCategorySchema = z.enum(FACILITY_CATEGORIES);
export const fireWaterSubtypeSchema = z.enum(FIRE_WATER_SUBTYPES);
export const fireOrganizationSubtypeSchema = z.enum(
  FIRE_ORGANIZATION_SUBTYPES,
);

export const fireWaterFacilitySchema: z.ZodType<FireWaterFacility> = z
  .object({
    ...baseFacilityShape,
    category: z.literal("FIRE_WATER"),
    subtype: fireWaterSubtypeSchema,
    details: z
      .object({
        installedYear: z.number().int().min(1000).max(9999).optional(),
        pressure: z.number().refine(Number.isFinite).min(0).optional(),
        safetyCenter: nonEmptyStringSchema.optional(),
        fireStation: nonEmptyStringSchema.optional(),
        fireStationPhone: nonEmptyStringSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((facility, context) => {
    validateNamespacedId("fire-water", facility, context);
  });

export const shelterFacilitySchema: z.ZodType<ShelterFacility> = z
  .object({
    ...baseFacilityShape,
    category: z.literal("SHELTER"),
    subtype: z.literal("CIVIL_DEFENSE_SHELTER"),
    details: z.object({ status: z.literal("사용중") }).strict(),
  })
  .strict()
  .superRefine((facility, context) => {
    validateNamespacedId("shelter", facility, context);
  });

const dailyHoursSchema = z
  .object({
    start: nonEmptyStringSchema.refine(
      (value) => isValidAedTime(value, "start"),
      "Invalid AED start time",
    ),
    end: nonEmptyStringSchema.refine(
      (value) => isValidAedTime(value, "end"),
      "Invalid AED end time",
    ),
  })
  .strict();

const operatingHoursShape = Object.fromEntries(
  DAYS_OF_WEEK.map((day) => [day, dailyHoursSchema.optional()]),
) as Record<(typeof DAYS_OF_WEEK)[number], z.ZodOptional<typeof dailyHoursSchema>>;

export const aedFacilitySchema: z.ZodType<AedFacility> = z
  .object({
    ...baseFacilityShape,
    category: z.literal("AED"),
    subtype: z.literal("AED"),
    details: z
      .object({
        phone: nonEmptyStringSchema.optional(),
        manufacturer: nonEmptyStringSchema.optional(),
        model: nonEmptyStringSchema.optional(),
        mobility: z.literal("FIXED"),
        operatingHours: z.object(operatingHoursShape).strict().optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((facility, context) => {
    validateNamespacedId("aed", facility, context);
  });

export const fireOrganizationFacilitySchema: z.ZodType<FireOrganizationFacility> =
  z
    .object({
      ...baseFacilityShape,
      category: z.literal("OTHER"),
      subtype: fireOrganizationSubtypeSchema,
      details: z.object({}).strict(),
    })
    .strict()
    .superRefine((facility, context) => {
      validateNamespacedId("fire-org", facility, context);
    });

const heatShelterOperatingPeriodSchema = z
  .object({
    days: z.array(z.enum(HEAT_SHELTER_DAYS)).min(1),
    start: nonEmptyStringSchema.regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: nonEmptyStringSchema.regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/),
  })
  .strict();

export const heatShelterFacilitySchema: z.ZodType<HeatShelterFacility> = z
  .object({
    ...baseFacilityShape,
    category: z.literal("OTHER"),
    subtype: z.literal(HEAT_SHELTER_SUBTYPE),
    details: z
      .object({
        facilityType1: nonEmptyStringSchema,
        facilityType2: nonEmptyStringSchema,
        regularHours: heatShelterOperatingPeriodSchema.optional(),
        extendedHours: heatShelterOperatingPeriodSchema.optional(),
        additionalHours: heatShelterOperatingPeriodSchema.optional(),
        remarks: nonEmptyStringSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((facility, context) => {
    validateNamespacedId("heat-shelter", facility, context);
  });

export const childSafetyHouseFacilitySchema: z.ZodType<ChildSafetyHouseFacility> = z
  .object({
    ...baseFacilityShape,
    category: z.literal("OTHER"),
    subtype: z.literal(CHILD_SAFETY_HOUSE_SUBTYPE),
    details: z.object({ phone: nonEmptyStringSchema.optional() }).strict(),
  })
  .strict()
  .superRefine((facility, context) => {
    validateNamespacedId("child-safety-house", facility, context);
  });

export const otherFacilitySchema: z.ZodType<OtherFacility> = z.union([
  fireOrganizationFacilitySchema,
  heatShelterFacilitySchema,
  childSafetyHouseFacilitySchema,
]);

export const facilitySchema: z.ZodType<Facility> = z.union([
  fireWaterFacilitySchema,
  shelterFacilitySchema,
  aedFacilitySchema,
  otherFacilitySchema,
]);

export const fireWaterFacilitiesSchema = z
  .array(fireWaterFacilitySchema)
  .min(1, "Fire water dataset must not be empty");

export const shelterFacilitiesSchema = z
  .array(shelterFacilitySchema)
  .min(1, "Shelter dataset must not be empty");

export const aedFacilitiesSchema = z
  .array(aedFacilitySchema)
  .min(1, "AED dataset must not be empty");

export const fireOrganizationFacilitiesSchema = z
  .array(fireOrganizationFacilitySchema)
  .min(1, "Fire organization dataset must not be empty");

export const heatShelterFacilitiesSchema = z
  .array(heatShelterFacilitySchema)
  .min(1, "Heat shelter dataset must not be empty");

export const childSafetyHouseFacilitiesSchema = z
  .array(childSafetyHouseFacilitySchema)
  .min(1, "Child safety house dataset must not be empty");

export const otherFacilitiesSchema = z.array(otherFacilitySchema);
