import type { Facility } from "@/shared/types/facility";

export function normalizeFacilitySearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");
}

export function createFacilitySearchText(facility: Facility): string {
  return normalizeFacilitySearchText(
    [
      facility.name,
      facility.address,
      facility.roadAddress,
      facility.lotAddress,
      facility.detailLocation,
    ]
      .filter((value): value is string => value !== undefined)
      .join(" "),
  );
}

export function tokenizeFacilitySearchQuery(query: string): string[] {
  const normalized = normalizeFacilitySearchText(query);
  return normalized === "" ? [] : normalized.split(" ");
}

export function matchesFacilitySearch(
  searchableText: string,
  tokens: readonly string[],
): boolean {
  return tokens.every((token) => searchableText.includes(token));
}
