import {
  normalizeRequiredString,
  parseRequiredNumber,
} from "../../../../src/shared/lib/normalize";
import {
  assertUniqueValues,
  createNamespacedId,
} from "../../../../src/shared/lib/validation";
import { fireOrganizationFacilitySchema } from "../../../../src/shared/schemas/facility";
import {
  FIRE_ORGANIZATION_SUBTYPES,
  type FireOrganizationFacility,
  type FireOrganizationSubtype,
} from "../../../../src/shared/types/facility";
import { FIRE_ORG_SOURCE_NAME } from "./constants";
import { convertEpsg5186ToWgs84 } from "./coordinates";
import type { FireOrgReference, FireOrgSourceRow } from "./schema";

export interface SelectedFireOrgSource {
  sourceId: string;
  name: string;
  sourceType: string;
  parentDepartmentId: string;
  x: number;
  y: number;
  address: string;
  subtype: FireOrganizationSubtype;
  latitude: number;
  longitude: number;
}

export interface FireOrgTransformResult {
  facilities: FireOrganizationFacility[];
  selectedRows: number;
  missingRegistryIds: string[];
  duplicateSourceIds: string[];
  subtypeCounts: Record<FireOrganizationSubtype, number>;
  selectedSource: SelectedFireOrgSource[];
}

export function classifyFireOrganizationSubtype(
  sourceType: string,
  name: string,
): FireOrganizationSubtype {
  if (sourceType === "소방서" && name.endsWith("소방서")) {
    return "FIRE_STATION";
  }

  if (sourceType === "안전센터/구조대") {
    if (name.endsWith("119안전센터")) {
      return "FIRE_SAFETY_CENTER";
    }

    if (name.includes("구조대")) {
      return "FIRE_RESCUE_UNIT";
    }
  }

  throw new Error(
    `Unknown fire organization type/name combination: ${sourceType} / ${name}`,
  );
}

export function transformFireOrgRows(
  rows: readonly FireOrgSourceRow[],
  reference: FireOrgReference,
): FireOrgTransformResult {
  const indexedRows = rows.map((row, index) => ({
    row,
    sourceId: normalizeRequiredString(
      row.DEPT_id,
      `Fire organization source row ${index + 1} DEPT_id`,
    ),
  }));
  const sourceIds = indexedRows.map(({ sourceId }) => sourceId);

  assertUniqueValues(sourceIds, "fire organization DEPT_id");

  const duplicateSourceIds: string[] = [];
  const rowBySourceId = new Map(
    indexedRows.map(({ sourceId, row }) => [sourceId, row]),
  );
  const missingRegistryIds = reference.facilities
    .map((facility) => facility.sourceId)
    .filter((sourceId) => !rowBySourceId.has(sourceId));

  if (missingRegistryIds.length > 0) {
    throw new Error(
      `Fire organization reference sourceId not found: ${missingRegistryIds.join(", ")}`,
    );
  }

  const selectedSource: SelectedFireOrgSource[] = [];
  const facilities = reference.facilities.map((entry) => {
    const row = rowBySourceId.get(entry.sourceId);

    if (row === undefined) {
      throw new Error(`Fire organization sourceId not found: ${entry.sourceId}`);
    }

    const name = normalizeRequiredString(
      row.DEPT_NM,
      `Fire organization ${entry.sourceId} DEPT_NM`,
    );

    if (name !== entry.expectedName) {
      throw new Error(
        `Fire organization name mismatch for ${entry.sourceId}: expected ${entry.expectedName}, received ${name}`,
      );
    }

    const sourceType = normalizeRequiredString(
      row.TYPE_SE_NM,
      `Fire organization ${entry.sourceId} TYPE_SE_NM`,
    );
    const parentDepartmentId = normalizeRequiredString(
      row.UP_DEPT_ID,
      `Fire organization ${entry.sourceId} UP_DEPT_ID`,
    );
    const x = parseRequiredNumber(
      row.XCRD,
      `Fire organization ${entry.sourceId} XCRD`,
    );
    const y = parseRequiredNumber(
      row.YCRD,
      `Fire organization ${entry.sourceId} YCRD`,
    );
    const address = normalizeRequiredString(
      entry.address,
      `Fire organization reference ${entry.sourceId} address`,
    );
    const subtype = classifyFireOrganizationSubtype(sourceType, name);
    const { latitude, longitude } = convertEpsg5186ToWgs84(x, y);

    selectedSource.push({
      sourceId: entry.sourceId,
      name,
      sourceType,
      parentDepartmentId,
      x,
      y,
      address,
      subtype,
      latitude,
      longitude,
    });

    return fireOrganizationFacilitySchema.parse({
      id: createNamespacedId("fire-org", entry.sourceId),
      category: "OTHER",
      subtype,
      name,
      latitude,
      longitude,
      address,
      source: FIRE_ORG_SOURCE_NAME,
      sourceId: entry.sourceId,
      details: {},
    });
  });
  const subtypeCounts = Object.fromEntries(
    FIRE_ORGANIZATION_SUBTYPES.map((subtype) => [
      subtype,
      facilities.filter((facility) => facility.subtype === subtype).length,
    ]),
  ) as Record<FireOrganizationSubtype, number>;

  return {
    facilities: facilities.sort((left, right) =>
      left.sourceId < right.sourceId
        ? -1
        : left.sourceId > right.sourceId
          ? 1
          : 0,
    ),
    selectedRows: facilities.length,
    missingRegistryIds,
    duplicateSourceIds,
    subtypeCounts,
    selectedSource,
  };
}
