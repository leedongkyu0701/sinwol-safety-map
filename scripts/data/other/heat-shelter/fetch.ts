import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { z } from "zod";

import {
  HEAT_SHELTER_API_BASE_URL,
  HEAT_SHELTER_PAGE_SIZE,
  HEAT_SHELTER_REQUEST_TIMEOUT_MS,
  HEAT_SHELTER_SERVICE_NAME,
} from "./constants";
import {
  heatShelterApiResponseSchema,
  seoulApiJsonErrorSchema,
  type HeatShelterSourceRow,
} from "./schema";

const SEOUL_API_SUCCESS_CODE = "INFO-000";

export interface FetchedHeatShelterSource {
  rows: HeatShelterSourceRow[];
  totalCount: number;
  fetchedAt: string;
  pagesFetched: number;
}

interface HeatShelterPage {
  rows: HeatShelterSourceRow[];
  totalCount: number;
}

function getApiKey(): string {
  if (process.env.SEOUL_OPEN_DATA_KEY === undefined && existsSync(".env.local")) {
    loadEnvFile(".env.local");
  }

  const apiKey = process.env.SEOUL_OPEN_DATA_KEY?.trim();

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error(
      "SEOUL_OPEN_DATA_KEY is required to fetch heat shelter data. Set it in .env.local or the process environment.",
    );
  }

  return apiKey;
}

function buildRequestUrl(apiKey: string, start: number, end: number): string {
  return `${HEAT_SHELTER_API_BASE_URL}/${encodeURIComponent(apiKey)}/json/${HEAT_SHELTER_SERVICE_NAME}/${start}/${end}/`;
}

function normalizeMessage(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

function findXmlError(payload: string): { code: string; message: string } | undefined {
  const code = payload.match(/<CODE>([^<]+)<\/CODE>/)?.[1];
  const message =
    payload.match(/<MESSAGE><!\[CDATA\[([\s\S]*?)\]\]><\/MESSAGE>/)?.[1] ??
    payload.match(/<MESSAGE>([\s\S]*?)<\/MESSAGE>/)?.[1];

  if (code === undefined) {
    return undefined;
  }

  return {
    code: normalizeMessage(code),
    message: normalizeMessage(message ?? "Unknown API error"),
  };
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
    .join("; ");
}

function parsePagePayload(payload: string, start: number, end: number): HeatShelterPage {
  let raw: unknown;

  try {
    raw = JSON.parse(payload) as unknown;
  } catch {
    const apiError = findXmlError(payload);

    if (apiError !== undefined) {
      throw new Error(
        `Heat shelter API failed for rows ${start}-${end}: ${apiError.code} ${apiError.message}`,
      );
    }

    throw new Error(
      `Heat shelter API returned a non-JSON response for rows ${start}-${end}`,
    );
  }

  const jsonError = seoulApiJsonErrorSchema.safeParse(raw);

  if (jsonError.success) {
    throw new Error(
      `Heat shelter API failed for rows ${start}-${end}: ${jsonError.data.RESULT.CODE} ${normalizeMessage(jsonError.data.RESULT.MESSAGE)}`,
    );
  }

  const parsed = heatShelterApiResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `Heat shelter API response validation failed for rows ${start}-${end}: ${formatZodIssues(parsed.error)}`,
    );
  }

  const service = parsed.data[HEAT_SHELTER_SERVICE_NAME];

  if (service.RESULT.CODE !== SEOUL_API_SUCCESS_CODE) {
    throw new Error(
      `Heat shelter API failed for rows ${start}-${end}: ${service.RESULT.CODE} ${normalizeMessage(service.RESULT.MESSAGE)}`,
    );
  }

  return { rows: service.row, totalCount: service.list_total_count };
}

async function fetchPage(
  apiKey: string,
  start: number,
  end: number,
): Promise<HeatShelterPage> {
  let response: Response;

  try {
    response = await fetch(buildRequestUrl(apiKey, start, end), {
      signal: AbortSignal.timeout(HEAT_SHELTER_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`Heat shelter API request failed for rows ${start}-${end}`);
  }

  if (!response.ok) {
    throw new Error(
      `Heat shelter API HTTP error for rows ${start}-${end}: ${response.status}`,
    );
  }

  return parsePagePayload(await response.text(), start, end);
}

function assertPageLength(
  page: HeatShelterPage,
  start: number,
  end: number,
  totalCount: number,
): void {
  const expectedLength = Math.min(end, totalCount) - start + 1;

  if (page.rows.length !== expectedLength) {
    throw new Error(
      `Heat shelter API page ${start}-${end} returned ${page.rows.length} rows; expected ${expectedLength}`,
    );
  }
}

export async function fetchHeatShelterSource(): Promise<FetchedHeatShelterSource> {
  const apiKey = getApiKey();
  const firstStart = 1;
  const firstEnd = HEAT_SHELTER_PAGE_SIZE;
  const firstPage = await fetchPage(apiKey, firstStart, firstEnd);
  const totalCount = firstPage.totalCount;

  if (totalCount === 0) {
    throw new Error("Heat shelter API returned zero total rows");
  }

  assertPageLength(firstPage, firstStart, firstEnd, totalCount);
  const rows = [...firstPage.rows];
  let pagesFetched = 1;

  for (
    let start = HEAT_SHELTER_PAGE_SIZE + 1;
    start <= totalCount;
    start += HEAT_SHELTER_PAGE_SIZE
  ) {
    const end = Math.min(start + HEAT_SHELTER_PAGE_SIZE - 1, totalCount);
    const page = await fetchPage(apiKey, start, end);

    if (page.totalCount !== totalCount) {
      throw new Error(
        `Heat shelter API total count changed during pagination: ${totalCount} to ${page.totalCount}`,
      );
    }

    assertPageLength(page, start, end, totalCount);
    rows.push(...page.rows);
    pagesFetched += 1;
  }

  if (rows.length !== totalCount) {
    throw new Error(
      `Heat shelter API pagination incomplete: fetched ${rows.length} of ${totalCount} rows`,
    );
  }

  return { rows, totalCount, fetchedAt: new Date().toISOString(), pagesFetched };
}
