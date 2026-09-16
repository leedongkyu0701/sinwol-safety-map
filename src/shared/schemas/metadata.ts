import { z } from "zod";

const sourceSummarySchema = z
  .object({
    count: z.number().int().nonnegative(),
    source: z.string().trim().min(1).optional(),
    sourceUpdatedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    fetchedAt: z.string().datetime({ offset: true }).optional(),
    sourceFileSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();

export const metadataSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
    sources: z
      .object({
        fireWater: sourceSummarySchema,
        shelter: sourceSummarySchema,
        aed: sourceSummarySchema,
        other: sourceSummarySchema,
      })
      .strict(),
  })
  .strict();

export type DataMetadata = z.infer<typeof metadataSchema>;
