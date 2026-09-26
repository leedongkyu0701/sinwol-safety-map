import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { z } from "zod";

import {
  CHILD_SAFETY_HOUSE_API_URL,
  CHILD_SAFETY_HOUSE_CLASS_CODE,
  CHILD_SAFETY_HOUSE_PAGE_SIZE,
  CHILD_SAFETY_HOUSE_REQUEST_TIMEOUT_MS,
} from "./constants";
import {
  childSafetyHouseApiResponseSchema,
  type ChildSafetyHouseSourceRow,
} from "./schema";

export interface FetchedChildSafetyHouseSource {
  rows: ChildSafetyHouseSourceRow[];
  totalCount: number;
  pagesFetched: number;
  fetchedAt: string;
}

function getCredentials(): { esntlId: string; authKey: string } {
  if (
    (process.env.SAFE182_ESNTL_ID === undefined ||
      process.env.SAFE182_AUTH_KEY === undefined) &&
    existsSync(".env.local")
  ) {
    loadEnvFile(".env.local");
  }

  const esntlId = process.env.SAFE182_ESNTL_ID?.trim();
  const authKey = process.env.SAFE182_AUTH_KEY?.trim();
  if (!esntlId || !authKey) {
    throw new Error(
      "SAFE182_ESNTL_ID and SAFE182_AUTH_KEY are required in .env.local or the process environment.",
    );
  }
  return { esntlId, authKey };
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
    .join("; ");
}

async function fetchPage(
  credentials: { esntlId: string; authKey: string },
  pageIndex: number,
): Promise<{ rows: ChildSafetyHouseSourceRow[]; totalCount: number }> {
  const body = new URLSearchParams({
    esntlId: credentials.esntlId,
    authKey: credentials.authKey,
    pageIndex: String(pageIndex),
    pageUnit: String(CHILD_SAFETY_HOUSE_PAGE_SIZE),
    clArray: CHILD_SAFETY_HOUSE_CLASS_CODE,
  });

  let response: Response;
  try {
    response = await fetch(CHILD_SAFETY_HOUSE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(CHILD_SAFETY_HOUSE_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`SafeDream API request failed for page ${pageIndex}`);
  }
  if (!response.ok) {
    throw new Error(
      `SafeDream API HTTP error for page ${pageIndex}: ${response.status}`,
    );
  }

  let raw: unknown;
  const payload = await response.text();
  try {
    raw = JSON.parse(payload) as unknown;
  } catch {
    const code = payload.match(/<result>\s*([^<]+)\s*<\/result>/i)?.[1];
    const message = payload.match(/<msg>\s*([^<]+)\s*<\/msg>/i)?.[1];
    if (code !== undefined) {
      throw new Error(
        `SafeDream API returned non-JSON error ${code.trim()} on page ${pageIndex}: ${(message ?? "").trim().slice(0, 240)}`,
      );
    }
    throw new Error(`SafeDream API returned invalid JSON for page ${pageIndex}`);
  }
  if (
    raw !== null &&
    typeof raw === "object" &&
    "result" in raw &&
    raw.result !== "00"
  ) {
    const message = "msg" in raw && typeof raw.msg === "string" ? raw.msg : "";
    throw new Error(
      `SafeDream API returned result ${String(raw.result)} on page ${pageIndex}: ${message.slice(0, 240)}`,
    );
  }
  const parsed = childSafetyHouseApiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `SafeDream API response validation failed for page ${pageIndex}: ${formatZodIssues(parsed.error)}`,
    );
  }
  if (parsed.data.result !== "00") {
    throw new Error(
      `SafeDream API returned result ${parsed.data.result} on page ${pageIndex}: ${(parsed.data.msg ?? "").slice(0, 240)}`,
    );
  }
  return { rows: parsed.data.list, totalCount: parsed.data.totalCount };
}

export async function fetchChildSafetyHouseSource(): Promise<FetchedChildSafetyHouseSource> {
  const credentials = getCredentials();
  const firstPage = await fetchPage(credentials, 1);
  const totalCount = firstPage.totalCount;
  if (totalCount === 0) {
    throw new Error("SafeDream API returned zero records");
  }
  const expectedFirstLength = Math.min(totalCount, CHILD_SAFETY_HOUSE_PAGE_SIZE);
  if (firstPage.rows.length !== expectedFirstLength) {
    throw new Error(
      `SafeDream page 1 returned ${firstPage.rows.length} rows; expected ${expectedFirstLength}`,
    );
  }
  const rows = [...firstPage.rows];
  const pageCount = Math.ceil(totalCount / CHILD_SAFETY_HOUSE_PAGE_SIZE);
  for (let pageIndex = 2; pageIndex <= pageCount; pageIndex += 1) {
    const page = await fetchPage(credentials, pageIndex);
    if (page.totalCount !== totalCount) {
      throw new Error(
        `SafeDream totalCount changed during pagination: ${totalCount} to ${page.totalCount}`,
      );
    }
    const expectedLength = Math.min(
      CHILD_SAFETY_HOUSE_PAGE_SIZE,
      totalCount - (pageIndex - 1) * CHILD_SAFETY_HOUSE_PAGE_SIZE,
    );
    if (page.rows.length !== expectedLength) {
      throw new Error(
        `SafeDream page ${pageIndex} returned ${page.rows.length} rows; expected ${expectedLength}`,
      );
    }
    rows.push(...page.rows);
  }
  if (rows.length !== totalCount) {
    throw new Error(
      `SafeDream pagination incomplete: fetched ${rows.length} of ${totalCount} rows`,
    );
  }
  return { rows, totalCount, pagesFetched: pageCount, fetchedAt: new Date().toISOString() };
}
