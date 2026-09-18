import { normalizeAedTime } from "../../../src/shared/lib/operating-hours";
import { normalizeOptionalString } from "../../../src/shared/lib/normalize";
import type {
  DayOfWeek,
  OperatingHours,
} from "../../../src/shared/types/facility";
import type { AedSourceRow } from "./schema";

const AED_DAY_SOURCE_FIELDS: Record<
  DayOfWeek,
  { start: keyof AedSourceRow; end: keyof AedSourceRow }
> = {
  monday: { start: "monSttTme", end: "monEndTme" },
  tuesday: { start: "tueSttTme", end: "tueEndTme" },
  wednesday: { start: "wedSttTme", end: "wedEndTme" },
  thursday: { start: "thuSttTme", end: "thuEndTme" },
  friday: { start: "friSttTme", end: "friEndTme" },
  saturday: { start: "satSttTme", end: "satEndTme" },
  sunday: { start: "sunSttTme", end: "sunEndTme" },
  holiday: { start: "holSttTme", end: "holEndTme" },
};

export interface AedOperatingHoursAudit {
  fullDayRanges: number;
  extendedEndTimeRanges: number;
  missingDayFields: number;
  incompleteRanges: number;
  invalidRanges: number;
  timeValueCounts: Record<string, number>;
}

export interface NormalizedAedOperatingHours {
  operatingHours?: OperatingHours;
  audit: AedOperatingHoursAudit;
}

export function createEmptyOperatingHoursAudit(): AedOperatingHoursAudit {
  return {
    fullDayRanges: 0,
    extendedEndTimeRanges: 0,
    missingDayFields: 0,
    incompleteRanges: 0,
    invalidRanges: 0,
    timeValueCounts: {},
  };
}

function incrementValueCount(
  counts: Record<string, number>,
  value: string,
): void {
  counts[value] = (counts[value] ?? 0) + 1;
}

export function mergeOperatingHoursAudit(
  target: AedOperatingHoursAudit,
  source: AedOperatingHoursAudit,
): void {
  target.fullDayRanges += source.fullDayRanges;
  target.extendedEndTimeRanges += source.extendedEndTimeRanges;
  target.missingDayFields += source.missingDayFields;
  target.incompleteRanges += source.incompleteRanges;
  target.invalidRanges += source.invalidRanges;

  for (const [value, count] of Object.entries(source.timeValueCounts)) {
    target.timeValueCounts[value] =
      (target.timeValueCounts[value] ?? 0) + count;
  }
}

export function normalizeAedOperatingHours(
  row: AedSourceRow,
  rowLabel: string,
): NormalizedAedOperatingHours {
  const operatingHours: OperatingHours = {};
  const audit = createEmptyOperatingHoursAudit();

  for (const [day, fields] of Object.entries(AED_DAY_SOURCE_FIELDS) as Array<
    [DayOfWeek, { start: keyof AedSourceRow; end: keyof AedSourceRow }]
  >) {
    const rawStart = normalizeOptionalString(row[fields.start]);
    const rawEnd = normalizeOptionalString(row[fields.end]);
    const startMissing = rawStart === undefined;
    const endMissing = rawEnd === undefined;

    if (startMissing && endMissing) {
      audit.missingDayFields += 1;
      continue;
    }

    if (startMissing !== endMissing) {
      audit.incompleteRanges += 1;
      throw new Error(`${rowLabel} has an incomplete ${day} operating range`);
    }

    let start: string | undefined;
    let end: string | undefined;

    try {
      start = normalizeAedTime(rawStart, "start");
      end = normalizeAedTime(rawEnd, "end");
    } catch (error) {
      audit.invalidRanges += 1;
      throw new Error(
        `${rowLabel} has an invalid ${day} operating range: ${error instanceof Error ? error.message : error}`,
      );
    }

    if (start === undefined || end === undefined) {
      throw new Error(`${rowLabel} has an incomplete ${day} operating range`);
    }

    operatingHours[day] = { start, end };
    incrementValueCount(audit.timeValueCounts, start);
    incrementValueCount(audit.timeValueCounts, end);

    if (start === "0000" && end === "2400") {
      audit.fullDayRanges += 1;
    }

    if (Number(end.slice(0, 2)) >= 24) {
      audit.extendedEndTimeRanges += 1;
    }
  }

  return {
    ...(Object.keys(operatingHours).length === 0 ? {} : { operatingHours }),
    audit,
  };
}
