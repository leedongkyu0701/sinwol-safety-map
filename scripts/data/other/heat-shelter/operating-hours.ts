import { normalizeOptionalString } from "../../../../src/shared/lib/normalize";
import {
  HEAT_SHELTER_DAYS,
  type HeatShelterDay,
  type HeatShelterOperatingPeriod,
} from "../../../../src/shared/types/facility";

const DAY_BY_SOURCE_TOKEN: Record<string, HeatShelterDay> = {
  월: "monday",
  화: "tuesday",
  수: "wednesday",
  목: "thursday",
  금: "friday",
  토: "saturday",
  일: "sunday",
};

function parseDays(value: unknown, label: string): HeatShelterDay[] | undefined {
  const normalized = normalizeOptionalString(value);

  if (normalized === undefined) {
    return undefined;
  }

  const tokens = normalized.split(",").map((token) => token.trim());
  const unknownTokens = tokens.filter((token) => DAY_BY_SOURCE_TOKEN[token] === undefined);

  if (unknownTokens.length > 0) {
    throw new Error(`${label} contains unknown weekday token(s): ${unknownTokens.join(", ")}`);
  }

  const days = tokens.map((token) => DAY_BY_SOURCE_TOKEN[token]);

  if (new Set(days).size !== days.length) {
    throw new Error(`${label} contains duplicate weekday token(s)`);
  }

  const dayOrder = new Map(HEAT_SHELTER_DAYS.map((day, index) => [day, index]));
  return days.sort((left, right) => dayOrder.get(left)! - dayOrder.get(right)!);
}

function parseTime(value: unknown, label: string, boundary: "start" | "end"): string | undefined {
  const normalized = normalizeOptionalString(value);

  if (normalized === undefined) {
    return undefined;
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized) && !(boundary === "end" && normalized === "24:00")) {
    throw new Error(`${label} has invalid ${boundary} time: ${normalized}`);
  }

  return normalized;
}

export function normalizeHeatShelterHours(
  input: { days: unknown; start: unknown; end: unknown },
  label: string,
): HeatShelterOperatingPeriod | undefined {
  const days = parseDays(input.days, `${label} days`);
  const start = parseTime(input.start, label, "start");
  const end = parseTime(input.end, label, "end");
  const presentCount = [days, start, end].filter((value) => value !== undefined).length;

  if (presentCount === 0) {
    return undefined;
  }

  if (days === undefined || start === undefined || end === undefined) {
    throw new Error(`${label} is incomplete: days, start time, and end time are all required`);
  }

  return { days, start, end };
}

export function normalizeOptionalHeatShelterHours(
  enabled: unknown,
  input: { days: unknown; start: unknown; end: unknown },
  label: string,
): HeatShelterOperatingPeriod | undefined {
  const flag = normalizeOptionalString(enabled);

  if (flag !== "Y" && flag !== "N") {
    throw new Error(`${label} flag must be Y or N: ${flag ?? "<missing>"}`);
  }

  const period = normalizeHeatShelterHours(input, label);

  if (flag === "Y" && period === undefined) {
    throw new Error(`${label} is marked Y but days/start/end are missing`);
  }

  if (flag === "N" && period !== undefined) {
    throw new Error(`${label} is marked N but contains operating hours`);
  }

  return flag === "Y" ? period : undefined;
}
