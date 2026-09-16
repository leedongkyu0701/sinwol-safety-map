const MISSING_STRING_VALUES = new Set(["nan", "n/a"]);

export function normalizeOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();

  if (
    normalized.length === 0 ||
    MISSING_STRING_VALUES.has(normalized.toLowerCase())
  ) {
    return undefined;
  }

  return normalized;
}

export function normalizeRequiredString(value: unknown, field: string): string {
  const normalized = normalizeOptionalString(value);

  if (normalized === undefined) {
    throw new Error(`${field} is required`);
  }

  return normalized;
}

export function parseOptionalNumber(
  value: unknown,
  field = "number",
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${field} must be finite`);
    }

    return value;
  }

  const normalized = normalizeOptionalString(value);

  if (normalized === undefined) {
    return undefined;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a finite number: ${normalized}`);
  }

  return parsed;
}

export function parseRequiredNumber(value: unknown, field: string): number {
  const parsed = parseOptionalNumber(value, field);

  if (parsed === undefined) {
    throw new Error(`${field} is required`);
  }

  return parsed;
}

export function parseOptionalInteger(
  value: unknown,
  field = "integer",
): number | undefined {
  const parsed = parseOptionalNumber(value, field);

  if (parsed !== undefined && !Number.isInteger(parsed)) {
    throw new Error(`${field} must be an integer: ${parsed}`);
  }

  return parsed;
}
