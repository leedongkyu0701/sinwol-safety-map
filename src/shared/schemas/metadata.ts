import { z } from "zod";

export const sourceSummarySchema = z
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

const otherDatasetKeySchema = z.string().regex(/^[a-z][A-Za-z0-9]*$/);

export const otherSourceSummarySchema = z
  .object({
    count: z.number().int().nonnegative(),
    datasets: z.record(otherDatasetKeySchema, sourceSummarySchema).optional(),
  })
  .strict()
  .superRefine((summary, context) => {
    if (summary.datasets === undefined) {
      return;
    }

    const datasetCount = Object.values(summary.datasets).reduce(
      (total, dataset) => total + dataset.count,
      0,
    );

    if (datasetCount !== summary.count) {
      context.addIssue({
        code: "custom",
        path: ["datasets"],
        message: "OTHER dataset counts must sum to the OTHER count",
      });
    }
  });

export const metadataSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
    sources: z
      .object({
        fireWater: sourceSummarySchema,
        shelter: sourceSummarySchema,
        aed: sourceSummarySchema,
        other: otherSourceSummarySchema,
      })
      .strict(),
  })
  .strict();

export type DataMetadata = z.infer<typeof metadataSchema>;
export type SourceSummary = z.infer<typeof sourceSummarySchema>;
export type OtherSourceSummary = z.infer<typeof otherSourceSummarySchema>;
