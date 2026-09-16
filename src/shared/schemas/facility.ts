import { z } from "zod";

import {
  DAYS_OF_WEEK,
  FACILITY_CATEGORIES,
  FACILITY_MOBILITIES,
  FIRE_WATER_SUBTYPES,
  type AedFacility,
  type Facility,
  type FireWaterFacility,
  type OtherFacility,
  type ShelterFacility,
} from "@/shared/types/facility";

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

export const facilityCategorySchema = z.enum(FACILITY_CATEGORIES);
export const fireWaterSubtypeSchema = z.enum(FIRE_WATER_SUBTYPES);

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
        phone: nonEmptyStringSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((facility, context) => {
    if (facility.id !== `fire-water:${facility.sourceId}`) {
      context.addIssue({
        code: "custom",
        path: ["id"],
        message: "Fire water id must be namespaced from sourceId",
      });
    }
  });

export const shelterFacilitySchema: z.ZodType<ShelterFacility> = z
  .object({
    ...baseFacilityShape,
    category: z.literal("SHELTER"),
    subtype: nonEmptyStringSchema,
    details: z.object({ status: z.literal("사용중") }).strict(),
  })
  .strict();

const dailyHoursSchema = z
  .object({
    start: nonEmptyStringSchema.optional(),
    end: nonEmptyStringSchema.optional(),
  })
  .strict();

const operatingHoursShape = Object.fromEntries(
  DAYS_OF_WEEK.map((day) => [day, dailyHoursSchema.optional()]),
) as Record<(typeof DAYS_OF_WEEK)[number], z.ZodOptional<typeof dailyHoursSchema>>;

export const aedFacilitySchema: z.ZodType<AedFacility> = z
  .object({
    ...baseFacilityShape,
    category: z.literal("AED"),
    subtype: nonEmptyStringSchema,
    details: z
      .object({
        phone: nonEmptyStringSchema.optional(),
        manufacturer: nonEmptyStringSchema.optional(),
        model: nonEmptyStringSchema.optional(),
        mobility: z.enum(FACILITY_MOBILITIES),
        operatingHours: z.object(operatingHoursShape).strict().optional(),
      })
      .strict(),
  })
  .strict();

export const otherFacilitySchema: z.ZodType<OtherFacility> = z
  .object({
    ...baseFacilityShape,
    category: z.literal("OTHER"),
    subtype: nonEmptyStringSchema,
    details: z.record(z.string(), z.unknown()),
  })
  .strict();

export const facilitySchema: z.ZodType<Facility> = z.union([
  fireWaterFacilitySchema,
  shelterFacilitySchema,
  aedFacilitySchema,
  otherFacilitySchema,
]);

export const fireWaterFacilitiesSchema = z.array(fireWaterFacilitySchema);
