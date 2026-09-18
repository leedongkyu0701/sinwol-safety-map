import { z } from "zod";

import { FIRE_ORG_SERVICE_NAME } from "./constants";

const sourceValueSchema = z.union([z.string(), z.number(), z.null()]);

export const fireOrgSourceRowSchema = z
  .object({
    DEPT_id: sourceValueSchema,
    DEPT_NM: sourceValueSchema,
    TYPE_SE_NM: sourceValueSchema,
    UP_DEPT_ID: sourceValueSchema,
    XCRD: sourceValueSchema,
    YCRD: sourceValueSchema,
  })
  .strip();

export type FireOrgSourceRow = z.infer<typeof fireOrgSourceRowSchema>;

const fireOrgApiResultSchema = z
  .object({
    CODE: z.string().trim().min(1),
    MESSAGE: z.string(),
  })
  .passthrough();

const fireOrgApiServiceSchema = z
  .object({
    list_total_count: z.number().int().nonnegative(),
    RESULT: fireOrgApiResultSchema,
    row: z.array(fireOrgSourceRowSchema),
  })
  .passthrough();

export const fireOrgApiResponseSchema = z
  .object({
    [FIRE_ORG_SERVICE_NAME]: fireOrgApiServiceSchema,
  })
  .passthrough();

export const seoulApiJsonErrorSchema = z
  .object({ RESULT: fireOrgApiResultSchema })
  .passthrough();

const fireOrgReferenceFacilitySchema = z
  .object({
    sourceId: z.string().trim().min(1),
    expectedName: z.string().trim().min(1),
    address: z.string().trim().min(1),
  })
  .strict();

export const fireOrgReferenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    addressSource: z.string().trim().min(1),
    facilities: z.array(fireOrgReferenceFacilitySchema).min(1),
  })
  .strict()
  .superRefine((registry, context) => {
    const seen = new Set<string>();

    for (const [index, facility] of registry.facilities.entries()) {
      if (seen.has(facility.sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["facilities", index, "sourceId"],
          message: `Duplicate fire organization reference sourceId: ${facility.sourceId}`,
        });
      }

      seen.add(facility.sourceId);
    }
  });

export type FireOrgReference = z.infer<typeof fireOrgReferenceSchema>;
