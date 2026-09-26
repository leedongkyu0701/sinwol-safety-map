import { z } from "zod";

const sourceScalarSchema = z.union([z.string(), z.number(), z.null()]);

export const childSafetyHouseSourceRowSchema = z
  .object({
    rn: sourceScalarSchema.optional(),
    lcSn: sourceScalarSchema,
    bsshNm: sourceScalarSchema,
    telno: sourceScalarSchema.optional(),
    adres: sourceScalarSchema,
    etcAdres: sourceScalarSchema.optional(),
    zip: sourceScalarSchema.optional(),
    lcinfoLa: sourceScalarSchema,
    lcinfoLo: sourceScalarSchema,
    cl: sourceScalarSchema,
    clNm: sourceScalarSchema,
    scopeCd: sourceScalarSchema.optional(),
    scope: sourceScalarSchema.optional(),
    hmpg: sourceScalarSchema.optional(),
  })
  .passthrough();

export const childSafetyHouseApiResponseSchema = z
  .object({
    totalCount: z.coerce.number().int().nonnegative(),
    list: z.array(childSafetyHouseSourceRowSchema),
    result: z.string(),
    msg: z.string().optional(),
  })
  .passthrough();

export const childSafetyHouseReferenceDecisionSchema = z
  .object({
    sourceId: z.string().trim().min(1),
    decision: z.enum(["INCLUDE", "EXCLUDE"]),
    expectedName: z.string().trim().min(1),
    expectedAddress: z.string().trim().min(1),
    reason: z.string().trim().min(1).optional(),
  })
  .strict();

export const childSafetyHouseReferenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    scope: z.literal("서울특별시 양천구 신월동"),
    decisions: z.array(childSafetyHouseReferenceDecisionSchema),
  })
  .strict()
  .superRefine((reference, context) => {
    const seen = new Set<string>();
    reference.decisions.forEach((decision, index) => {
      if (seen.has(decision.sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["decisions", index, "sourceId"],
          message: `Duplicate sourceId ${decision.sourceId}`,
        });
      }
      seen.add(decision.sourceId);
    });
  });

export type ChildSafetyHouseSourceRow = z.infer<
  typeof childSafetyHouseSourceRowSchema
>;
export type ChildSafetyHouseApiResponse = z.infer<
  typeof childSafetyHouseApiResponseSchema
>;
export type ChildSafetyHouseReference = z.infer<
  typeof childSafetyHouseReferenceSchema
>;
