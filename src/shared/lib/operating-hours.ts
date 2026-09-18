import { normalizeOptionalString } from "@/shared/lib/normalize";

export type AedTimeBoundary = "start" | "end";

const AED_TIME_PATTERN = /^\d{4}$/;

export function normalizeAedTime(
  value: unknown,
  boundary: AedTimeBoundary,
): string | undefined {
  const normalized = normalizeOptionalString(value);

  if (normalized === undefined) {
    return undefined;
  }

  if (!AED_TIME_PATTERN.test(normalized)) {
    throw new Error(`AED ${boundary} time must use four HHMM digits: ${normalized}`);
  }

  const hour = Number(normalized.slice(0, 2));
  const minute = Number(normalized.slice(2));
  const maximumHour = boundary === "start" ? 23 : 29;

  if (hour > maximumHour || minute > 59) {
    throw new Error(`Invalid AED ${boundary} time: ${normalized}`);
  }

  return normalized;
}

export function isValidAedTime(
  value: string,
  boundary: AedTimeBoundary,
): boolean {
  try {
    return normalizeAedTime(value, boundary) !== undefined;
  } catch {
    return false;
  }
}

function formatTime(value: string, boundary: AedTimeBoundary): string {
  const normalized = normalizeAedTime(value, boundary);

  if (normalized === undefined) {
    throw new Error(`AED ${boundary} time is required`);
  }

  const hour = Number(normalized.slice(0, 2));
  const minute = normalized.slice(2);

  return hour >= 24
    ? `익일 ${String(hour - 24).padStart(2, "0")}:${minute}`
    : `${normalized.slice(0, 2)}:${minute}`;
}

export function formatAedTimeRange(start: string, end: string): string {
  if (start === "0000" && end === "2400") {
    return "24시간";
  }

  return `${formatTime(start, "start")}–${formatTime(end, "end")}`;
}
