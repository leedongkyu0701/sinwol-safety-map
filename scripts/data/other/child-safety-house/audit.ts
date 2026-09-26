import type { ChildSafetyHouseSourceRow } from "./schema";
import type { ChildSafetyHouseTransformResult } from "./transform";
import { CHILD_SAFETY_HOUSE_SNAPSHOT_BASELINE } from "./constants";

export interface ChildSafetyHouseAudit {
  totalCount: number;
  pagesFetched: number;
  classCodeCounts: Record<string, number>;
  classNameCounts: Record<string, number>;
  candidateCount: number;
  includeCount: number;
  excludeCount: number;
  pendingCount: number;
  staleReferenceCount: number;
  mismatchedReferenceCount: number;
  publishedCount: number;
  malformedPhoneCount: number;
  omittedPhoneCount: number;
  duplicateSourceIds: string[];
  exactDuplicatesCollapsed: number;
  sameLocationGroups: ChildSafetyHouseTransformResult["sameLocationGroups"];
  coordinateRange?: { latitude: [number, number]; longitude: [number, number] };
  snapshotBaseline: "MATCH" | "DIFF";
  totalOtherRows: number;
}

function countValues(rows: readonly ChildSafetyHouseSourceRow[], key: "cl" | "clNm"): Record<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key] ?? "(missing)");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function createChildSafetyHouseAudit(
  totalCount: number,
  pagesFetched: number,
  rows: readonly ChildSafetyHouseSourceRow[],
  result: ChildSafetyHouseTransformResult,
  totalOtherRows: number,
): ChildSafetyHouseAudit {
  const facilities = result.facilities;
  const latitudes = facilities.map((facility) => Number(facility.latitude));
  const longitudes = facilities.map((facility) => Number(facility.longitude));
  return {
    totalCount,
    pagesFetched,
    classCodeCounts: countValues(rows, "cl"),
    classNameCounts: countValues(rows, "clNm"),
    candidateCount: result.candidates.length,
    includeCount: result.includeCount,
    excludeCount: result.excludeCount,
    pendingCount: result.pendingCandidates.length,
    staleReferenceCount: result.staleReferenceIds.length,
    mismatchedReferenceCount: result.mismatchedReferenceIds.length,
    publishedCount: facilities.length,
    malformedPhoneCount: result.malformedPhoneCount,
    omittedPhoneCount: result.omittedPhoneCount,
    duplicateSourceIds: result.duplicateSourceIds,
    exactDuplicatesCollapsed: result.exactDuplicatesCollapsed,
    sameLocationGroups: result.sameLocationGroups,
    ...(facilities.length === 0
      ? {}
      : {
          coordinateRange: {
            latitude: [Math.min(...latitudes), Math.max(...latitudes)] as [number, number],
            longitude: [Math.min(...longitudes), Math.max(...longitudes)] as [number, number],
          },
        }),
    snapshotBaseline:
      totalCount === CHILD_SAFETY_HOUSE_SNAPSHOT_BASELINE.sourceRows
        ? "MATCH"
        : "DIFF",
    totalOtherRows,
  };
}

export function printChildSafetyHouseAudit(audit: ChildSafetyHouseAudit): void {
  console.log("SafeDream child safety house audit:");
  console.log(`- API total rows: ${audit.totalCount.toLocaleString("en-US")} (${audit.snapshotBaseline} baseline ${CHILD_SAFETY_HOUSE_SNAPSHOT_BASELINE.sourceRows.toLocaleString("en-US")})`);
  console.log(`- Pages fetched: ${audit.pagesFetched}`);
  console.log(`- cl distribution: ${JSON.stringify(audit.classCodeCounts)}`);
  console.log(`- clNm distribution: ${JSON.stringify(audit.classNameCounts)}`);
  console.log(`- Yangcheon candidates: ${audit.candidateCount}`);
  console.log(`- Reference INCLUDE / EXCLUDE: ${audit.includeCount} / ${audit.excludeCount}`);
  console.log(`- Unreviewed candidates: ${audit.pendingCount}`);
  console.log(`- Reference missing / mismatched: ${audit.staleReferenceCount} / ${audit.mismatchedReferenceCount}`);
  console.log(`- Published rows: ${audit.publishedCount}`);
  console.log(`- Malformed / omitted phones: ${audit.malformedPhoneCount} / ${audit.omittedPhoneCount}`);
  console.log(`- Exact duplicates collapsed: ${audit.exactDuplicatesCollapsed}`);
  console.log(`- Duplicate lcSn: ${audit.duplicateSourceIds.length}`);
  console.log(`- Same-location groups: ${JSON.stringify(audit.sameLocationGroups)}`);
  console.log(`- Published coordinate range: ${JSON.stringify(audit.coordinateRange ?? null)}`);
  console.log(`- OTHER rows after merge: ${audit.totalOtherRows}`);
}

export function assertChildSafetyHouseAudit(audit: ChildSafetyHouseAudit): void {
  if (audit.pendingCount > 0 || audit.staleReferenceCount > 0 || audit.mismatchedReferenceCount > 0) {
    throw new Error("SafeDream scope review is incomplete; no snapshot was written");
  }
  if (audit.publishedCount === 0) {
    throw new Error("Refusing to publish an empty child safety house snapshot");
  }
}
