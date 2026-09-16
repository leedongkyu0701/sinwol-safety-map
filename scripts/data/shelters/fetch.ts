import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { z } from "zod";

import {
  SHELTER_API_BASE_URL,
  SHELTER_PAGE_SIZE,
  SHELTER_REQUEST_TIMEOUT_MS,
  SHELTER_SERVICE_NAME,
} from "./constants";
import {
  seoulApiJsonErrorSchema,
  shelterApiResponseSchema,
  type ShelterSourceRow,
} from "./schema";

const SEOUL_API_SUCCESS_CODE = "INFO-000";

export interface FetchedShelterSource {
  rows: ShelterSourceRow[];
  totalCount: number;
  fetchedAt: string;
}

interface ShelterPage {
  rows: ShelterSourceRow[];
  totalCount: number;
}

function loadLocalEnvironment(): void {
  if (
    process.env.SEOUL_OPEN_DATA_KEY === undefined &&
    existsSync(".env.local")
  ) {
    loadEnvFile(".env.local");
  }
}

function getApiKey(): string {
  loadLocalEnvironment();
  const apiKey = process.env.SEOUL_OPEN_DATA_KEY?.trim();

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error(
      "SEOUL_OPEN_DATA_KEY is required to fetch shelter data. Set it in .env.local or the process environment.",
    );
  }

  return apiKey;
}

function buildRequestUrl(apiKey: string, start: number, end: number): string {
  return `${SHELTER_API_BASE_URL}/${encodeURIComponent(apiKey)}/json/${SHELTER_SERVICE_NAME}/${start}/${end}/`;
}

function normalizeErrorMessage(value: string): string {
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
    code: normalizeErrorMessage(code),
    message: normalizeErrorMessage(message ?? "Unknown API error"),
  };
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
    .join("; ");
}

function parsePagePayload(
  payload: string,
  start: number,
  end: number,
): ShelterPage {
  let raw: unknown;

  try {
    raw = JSON.parse(payload) as unknown;
  } catch {
    const apiError = findXmlError(payload);

    if (apiError !== undefined) {
      throw new Error(
        `Shelter API failed for rows ${start}-${end}: ${apiError.code} ${apiError.message}`,
      );
    }

    throw new Error(
      `Shelter API returned a non-JSON response for rows ${start}-${end}`,
    );
  }

  const jsonError = seoulApiJsonErrorSchema.safeParse(raw);

  if (jsonError.success) {
    throw new Error(
      `Shelter API failed for rows ${start}-${end}: ${jsonError.data.RESULT.CODE} ${normalizeErrorMessage(jsonError.data.RESULT.MESSAGE)}`,
    );
  }

  const parsed = shelterApiResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `Shelter API response validation failed for rows ${start}-${end}: ${formatZodIssues(parsed.error)}`,
    );
  }

  const service = parsed.data[SHELTER_SERVICE_NAME];

  if (service.RESULT.CODE !== SEOUL_API_SUCCESS_CODE) {
    throw new Error(
      `Shelter API failed for rows ${start}-${end}: ${service.RESULT.CODE} ${normalizeErrorMessage(service.RESULT.MESSAGE)}`,
    );
  }

  return {
    rows: service.row,
    totalCount: service.list_total_count,
  };
}

async function fetchPage(
  apiKey: string,
  start: number,
  end: number,
): Promise<ShelterPage> {
  let response: Response;

  try {
    response = await fetch(buildRequestUrl(apiKey, start, end), {
      signal: AbortSignal.timeout(SHELTER_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`Shelter API request failed for rows ${start}-${end}`);
  }

  if (!response.ok) {
    throw new Error(
      `Shelter API HTTP error for rows ${start}-${end}: ${response.status}`,
    );
  }

  return parsePagePayload(await response.text(), start, end);
}

function assertPageLength(
  page: ShelterPage,
  start: number,
  end: number,
  totalCount: number,
): void {
  const expectedLength = Math.min(end, totalCount) - start + 1;

  if (page.rows.length !== expectedLength) {
    throw new Error(
      `Shelter API page ${start}-${end} returned ${page.rows.length} rows; expected ${expectedLength}`,
    );
  }
}

export async function fetchShelterSource(): Promise<FetchedShelterSource> {
  const apiKey = getApiKey();
  const firstStart = 1;
  const firstEnd = SHELTER_PAGE_SIZE;
  const firstPage = await fetchPage(apiKey, firstStart, firstEnd);
  const totalCount = firstPage.totalCount;

  if (totalCount === 0) {
    throw new Error("Shelter API returned zero total rows");
  }

  assertPageLength(firstPage, firstStart, firstEnd, totalCount);
  const rows = [...firstPage.rows];

  for (
    let start = SHELTER_PAGE_SIZE + 1;
    start <= totalCount;
    start += SHELTER_PAGE_SIZE
  ) {
    const end = Math.min(start + SHELTER_PAGE_SIZE - 1, totalCount);
    const page = await fetchPage(apiKey, start, end);

    if (page.totalCount !== totalCount) {
      throw new Error(
        `Shelter API total count changed during pagination: ${totalCount} to ${page.totalCount}`,
      );
    }

    assertPageLength(page, start, end, totalCount);
    rows.push(...page.rows);
  }

  if (rows.length !== totalCount) {
    throw new Error(
      `Shelter API pagination incomplete: fetched ${rows.length} of ${totalCount} rows`,
    );
  }

  return {
    rows,
    totalCount,
    fetchedAt: new Date().toISOString(),
  };
}
