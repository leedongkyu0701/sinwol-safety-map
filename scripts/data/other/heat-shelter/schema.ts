import { z } from "zod";

import { HEAT_SHELTER_SERVICE_NAME } from "./constants";

const sourceValueSchema = z.union([z.string(), z.number(), z.null()]);

export const heatShelterSourceRowSchema = z
  .object({
    YEAR: sourceValueSchema,
    AREA_CD: sourceValueSchema,
    FACILITY_TYPE1: sourceValueSchema,
    FACILITY_TYPE2: sourceValueSchema,
    R_AREA_NM: sourceValueSchema,
    R_DETL_ADD: sourceValueSchema,
    LOTNO_ADDR: sourceValueSchema,
    RMRK: sourceValueSchema,
    LAT: sourceValueSchema,
    LON: sourceValueSchema,
    MAP_COORD_X: sourceValueSchema,
    MAP_COORD_Y: sourceValueSchema,
    OPR_DAYS: sourceValueSchema,
    OPR_START_TIME: sourceValueSchema,
    OPR_END_TIME: sourceValueSchema,
    EXT_OPR_YN: sourceValueSchema,
    EXT_OPR_DAYS: sourceValueSchema,
    EXT_OPR_START_TIME: sourceValueSchema,
    EXT_OPR_END_TIME: sourceValueSchema,
    ADD_OPR_YN: sourceValueSchema,
    ADD_OPR_DAYS: sourceValueSchema,
    ADD_OPR_START_TIME: sourceValueSchema,
    ADD_OPR_END_TIME: sourceValueSchema,
  })
  .strip();

export type HeatShelterSourceRow = z.infer<typeof heatShelterSourceRowSchema>;

const heatShelterApiResultSchema = z
  .object({
    CODE: z.string().trim().min(1),
    MESSAGE: z.string(),
  })
  .passthrough();

const heatShelterApiServiceSchema = z
  .object({
    list_total_count: z.number().int().nonnegative(),
    RESULT: heatShelterApiResultSchema,
    row: z.array(heatShelterSourceRowSchema),
  })
  .passthrough();

export const heatShelterApiResponseSchema = z
  .object({
    [HEAT_SHELTER_SERVICE_NAME]: heatShelterApiServiceSchema,
  })
  .passthrough();

export const seoulApiJsonErrorSchema = z
  .object({ RESULT: heatShelterApiResultSchema })
  .passthrough();
