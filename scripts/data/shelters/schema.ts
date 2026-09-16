import { z } from "zod";

import { SHELTER_SERVICE_NAME } from "./constants";

const sourceValueSchema = z.union([z.string(), z.number(), z.null()]);

export const shelterSourceRowSchema = z
  .object({
    OGDP_INST_CD: sourceValueSchema,
    MNG_NO: sourceValueSchema,
    SALS_STTS_NM: sourceValueSchema,
    LOTNO_ADDR: sourceValueSchema,
    ROAD_NM_ADDR: sourceValueSchema,
    BPLC_NM: sourceValueSchema,
    XCRD: sourceValueSchema,
    YCRD: sourceValueSchema,
  })
  .passthrough();

export type ShelterSourceRow = z.infer<typeof shelterSourceRowSchema>;

export const shelterApiResultSchema = z
  .object({
    CODE: z.string().trim().min(1),
    MESSAGE: z.string(),
  })
  .passthrough();

const shelterApiServiceSchema = z
  .object({
    list_total_count: z.number().int().nonnegative(),
    RESULT: shelterApiResultSchema,
    row: z.array(shelterSourceRowSchema),
  })
  .passthrough();

export const shelterApiResponseSchema = z
  .object({
    [SHELTER_SERVICE_NAME]: shelterApiServiceSchema,
  })
  .passthrough();

export const seoulApiJsonErrorSchema = z
  .object({
    RESULT: shelterApiResultSchema,
  })
  .passthrough();
