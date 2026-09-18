import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";

import {
  AED_API_BASE_URL,
  AED_API_ENDPOINT,
  AED_PAGE_SIZE,
  AED_QUERY_REGION,
  AED_REQUEST_TIMEOUT_MS,
} from "./constants";
import { aedApiResponseSchema, type AedSourceRow } from "./schema";

const AED_API_SUCCESS_CODE = "00";
const xmlParser = new XMLParser({
  parseTagValue: false,
  trimValues: true,
});

export interface FetchedAedSource {
  rows: AedSourceRow[];
  totalCount: number;
  fetchedAt: string;
  pagesFetched: number;
}

interface AedPage {
  rows: AedSourceRow[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
}

function loadLocalEnvironment(): void {
  if (
    process.env.DATA_GO_KR_SERVICE_KEY === undefined &&
    existsSync(".env.local")
  ) {
    loadEnvFile(".env.local");
  }
}

function getApiKey(): string {
  loadLocalEnvironment();
  const apiKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error(
      "DATA_GO_KR_SERVICE_KEY is required to fetch AED data. Set it in .env.local or the process environment.",
    );
  }

  return apiKey;
}

function encodeServiceKey(apiKey: string): string {
  return apiKey.includes("%") ? apiKey : encodeURIComponent(apiKey);
}

function buildRequestUrl(
  apiKey: string,
  pageNo: number,
  numOfRows: number,
): string {
  const query = new URLSearchParams({
    Q0: AED_QUERY_REGION.province,
    Q1: AED_QUERY_REGION.district,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });

  return `${AED_API_BASE_URL}/${AED_API_ENDPOINT}?${query.toString()}&serviceKey=${encodeServiceKey(apiKey)}`;
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
    .join("; ");
}

function normalizeMessage(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

export function parseAedPagePayload(payload: string): AedPage {
  const validation = XMLValidator.validate(payload);

  if (validation !== true) {
    throw new Error("AED API returned malformed XML");
  }

  let raw: unknown;

  try {
    raw = xmlParser.parse(payload) as unknown;
  } catch {
    throw new Error("AED API XML parsing failed");
  }

  const parsed = aedApiResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `AED API response validation failed: ${formatZodIssues(parsed.error)}`,
    );
  }

  const { header, body } = parsed.data.response;

  if (header.resultCode !== AED_API_SUCCESS_CODE) {
    throw new Error(
      `AED API failed: ${header.resultCode} ${normalizeMessage(header.resultMsg)}`,
    );
  }

  const item = body.items.item;

  return {
    rows: Array.isArray(item) ? item : [item],
    totalCount: body.totalCount,
    pageNo: body.pageNo,
    numOfRows: body.numOfRows,
  };
}

async function fetchPage(
  apiKey: string,
  pageNo: number,
  pageSize: number,
): Promise<AedPage> {
  let response: Response;

  try {
    response = await fetch(buildRequestUrl(apiKey, pageNo, pageSize), {
      signal: AbortSignal.timeout(AED_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`AED API request failed for page ${pageNo}`);
  }

  if (!response.ok) {
    throw new Error(`AED API HTTP error for page ${pageNo}: ${response.status}`);
  }

  return parseAedPagePayload(await response.text());
}

function assertPage(
  page: AedPage,
  requestedPage: number,
  totalCount: number,
): void {
  if (page.pageNo !== requestedPage) {
    throw new Error(
      `AED API returned page ${page.pageNo}; expected ${requestedPage}`,
    );
  }

  if (page.totalCount !== totalCount) {
    throw new Error(
      `AED API total count changed during pagination: ${totalCount} to ${page.totalCount}`,
    );
  }

  const offset = (requestedPage - 1) * AED_PAGE_SIZE;
  const expectedRows = Math.min(AED_PAGE_SIZE, totalCount - offset);

  if (page.numOfRows !== AED_PAGE_SIZE || page.rows.length !== expectedRows) {
    throw new Error(
      `AED API page ${requestedPage} returned ${page.rows.length} rows with numOfRows=${page.numOfRows}; expected ${expectedRows} rows with numOfRows=${AED_PAGE_SIZE}`,
    );
  }
}

export async function fetchAedSource(): Promise<FetchedAedSource> {
  const apiKey = getApiKey();
  const firstPage = await fetchPage(apiKey, 1, AED_PAGE_SIZE);
  const totalCount = firstPage.totalCount;

  if (totalCount === 0) {
    throw new Error("AED API returned zero total rows");
  }

  assertPage(firstPage, 1, totalCount);
  const rows = [...firstPage.rows];
  const totalPages = Math.ceil(totalCount / AED_PAGE_SIZE);

  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    const page = await fetchPage(apiKey, pageNo, AED_PAGE_SIZE);
    assertPage(page, pageNo, totalCount);
    rows.push(...page.rows);
  }

  if (rows.length !== totalCount) {
    throw new Error(
      `AED API pagination incomplete: fetched ${rows.length} of ${totalCount} rows`,
    );
  }

  return {
    rows,
    totalCount,
    fetchedAt: new Date().toISOString(),
    pagesFetched: totalPages,
  };
}
