export function mergeOtherFacilitiesByIdPrefix<T extends { id: string }>(
  existing: readonly T[],
  replacement: readonly T[],
  ownedIdPrefix: string,
): T[] {
  if (ownedIdPrefix.length === 0 || !ownedIdPrefix.endsWith(":")) {
    throw new Error("OTHER source ownership prefix must end with a colon");
  }

  const invalidReplacement = replacement.find(
    (facility) => !facility.id.startsWith(ownedIdPrefix),
  );

  if (invalidReplacement !== undefined) {
    throw new Error(
      `Replacement facility is outside ${ownedIdPrefix} ownership: ${invalidReplacement.id}`,
    );
  }

  const merged = [
    ...existing.filter((facility) => !facility.id.startsWith(ownedIdPrefix)),
    ...replacement,
  ].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  const ids = new Set<string>();

  for (const facility of merged) {
    if (ids.has(facility.id)) {
      throw new Error(`Duplicate OTHER facility id: ${facility.id}`);
    }

    ids.add(facility.id);
  }

  return merged;
}
