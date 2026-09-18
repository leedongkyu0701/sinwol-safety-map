import { z } from "zod";

const sourceValueSchema = z.union([z.string(), z.null()]);
const optionalSourceValueSchema = sourceValueSchema.optional();

export const aedSourceRowSchema = z
  .object({
    serialSeq: sourceValueSchema,
    org: sourceValueSchema,
    buildAddress: sourceValueSchema,
    buildPlace: optionalSourceValueSchema,
    clerkTel: optionalSourceValueSchema,
    wgs84Lat: sourceValueSchema,
    wgs84Lon: sourceValueSchema,
    mfg: optionalSourceValueSchema,
    model: optionalSourceValueSchema,
    monSttTme: optionalSourceValueSchema,
    monEndTme: optionalSourceValueSchema,
    tueSttTme: optionalSourceValueSchema,
    tueEndTme: optionalSourceValueSchema,
    wedSttTme: optionalSourceValueSchema,
    wedEndTme: optionalSourceValueSchema,
    thuSttTme: optionalSourceValueSchema,
    thuEndTme: optionalSourceValueSchema,
    friSttTme: optionalSourceValueSchema,
    friEndTme: optionalSourceValueSchema,
    satSttTme: optionalSourceValueSchema,
    satEndTme: optionalSourceValueSchema,
    sunSttTme: optionalSourceValueSchema,
    sunEndTme: optionalSourceValueSchema,
    holSttTme: optionalSourceValueSchema,
    holEndTme: optionalSourceValueSchema,
  })
  .passthrough();

export type AedSourceRow = z.infer<typeof aedSourceRowSchema>;

const apiIntegerSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform(Number)
  .pipe(z.number().int().nonnegative());

const aedApiHeaderSchema = z
  .object({
    resultCode: z.string().trim().min(1),
    resultMsg: z.string(),
  })
  .passthrough();

const aedApiItemsSchema = z
  .object({
    item: z.union([aedSourceRowSchema, z.array(aedSourceRowSchema)]),
  })
  .passthrough();

const aedApiBodySchema = z
  .object({
    items: aedApiItemsSchema,
    numOfRows: apiIntegerSchema,
    pageNo: apiIntegerSchema,
    totalCount: apiIntegerSchema,
  })
  .passthrough();

export const aedApiResponseSchema = z
  .object({
    response: z
      .object({
        header: aedApiHeaderSchema,
        body: aedApiBodySchema,
      })
      .passthrough(),
  })
  .passthrough();
