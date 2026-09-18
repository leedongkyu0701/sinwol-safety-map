import { statSync } from "node:fs";

import {
  aedFacilitiesSchema,
  fireWaterFacilitiesSchema,
  otherFacilitiesSchema,
  shelterFacilitiesSchema,
} from "../../../src/shared/schemas/facility";
import { metadataSchema } from "../../../src/shared/schemas/metadata";
import type { Facility } from "../../../src/shared/types/facility";
import { assertSeoulCoordinate } from "../../../src/shared/lib/validation";
import {
  AED_OUTPUT_PATH,
  AED_PENDING_REVIEW_PATH,
  AED_REVIEW_PATH,
} from "../aed/constants";
import {
  aedMobilityRegistrySchema,
  aedPendingReviewSchema,
  type AedMobilityRegistry,
  type AedPendingReview,
} from "../aed/mobility";
import { FIRE_WATER_OUTPUT_PATH } from "../fire-water/constants";
import { OTHER_OUTPUT_PATH } from "../other/fire-org/constants";
import { SHELTER_OUTPUT_PATH } from "../shelters/constants";
import { readJsonFileIfExists } from "./write-json";

const METADATA_OUTPUT_PATH = "public/data/metadata.json";
const REQUIRED_FIELDS = [
  "id",
  "sourceId",
  "name",
  "address",
  "latitude",
  "longitude",
] as const;
const DATASET_NAMES = ["FIRE_WATER", "SHELTER", "AED", "OTHER"] as const;
const MAX_COORDINATE_EXAMPLES = 3;

type DatasetName = (typeof DATASET_NAMES)[number];
type RawRecord = Record<string, unknown>;

interface DatasetDefinition {
  name: DatasetName;
  path: string;
  schema: {
    safeParse: (value: unknown) => {
      success: boolean;
      data?: readonly Facility[];
      error?: { issues: readonly { path: PropertyKey[]; message: string }[] };
    };
  };
}

interface ParsedDataset {
  name: DatasetName;
  path: string;
  raw: unknown;
  facilities: readonly Facility[];
}

interface CoordinateGroup {
  latitude: number;
  longitude: number;
  facilities: readonly Facility[];
}

function formatErrorIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
): string {
  return issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}

function readRequiredJson(path: string, failures: string[]): unknown {
  try {
    const value = readJsonFileIfExists(path);

    if (value === undefined) {
      failures.push(`Required JSON file not found: ${path}`);
      return undefined;
    }

    return value;
  } catch (error) {
    failures.push(
      `Could not read JSON file ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function parseDataset(
  definition: DatasetDefinition,
  failures: string[],
): ParsedDataset | undefined {
  const raw = readRequiredJson(definition.path, failures);

  if (raw === undefined) {
    return undefined;
  }

  const parsed = definition.schema.safeParse(raw);

  if (!parsed.success || parsed.data === undefined) {
    failures.push(
      `${definition.name} schema invalid: ${formatErrorIssues(parsed.error?.issues ?? [])}`,
    );
    return undefined;
  }

  return {
    name: definition.name,
    path: definition.path,
    raw,
    facilities: parsed.data,
  };
}

function isMissingRequiredValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim().length === 0)
  );
}

function getRawRecords(value: unknown): readonly RawRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is RawRecord =>
      item !== null && typeof item === "object" && !Array.isArray(item),
  );
}

function countMissingFields(
  raw: unknown,
): Record<(typeof REQUIRED_FIELDS)[number], number> {
  const records = getRawRecords(raw);

  return Object.fromEntries(
    REQUIRED_FIELDS.map((field) => [
      field,
      records.filter((record) => isMissingRequiredValue(record[field])).length,
    ]),
  ) as Record<(typeof REQUIRED_FIELDS)[number], number>;
}

function findDuplicateValues(values: readonly string[]): string[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function groupDuplicateCoordinates(
  facilities: readonly Facility[],
): CoordinateGroup[] {
  const groups = new Map<string, Facility[]>();

  for (const facility of facilities) {
    const key = `${facility.latitude},${facility.longitude}`;
    const group = groups.get(key) ?? [];
    group.push(facility);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const [latitude, longitude] = key.split(",").map(Number);

      return { latitude, longitude, facilities: group };
    })
    .sort((left, right) =>
      `${left.latitude},${left.longitude}`.localeCompare(
        `${right.latitude},${right.longitude}`,
      ),
    );
}

function printCoordinateRanges(
  dataset: ParsedDataset,
  failures: string[],
): void {
  const latitudes = dataset.facilities.map((facility) => facility.latitude);
  const longitudes = dataset.facilities.map((facility) => facility.longitude);
  const invalidCoordinates = dataset.facilities.filter(
    (facility) =>
      !Number.isFinite(facility.latitude) ||
      !Number.isFinite(facility.longitude),
  );

  for (const facility of dataset.facilities) {
    try {
      assertSeoulCoordinate(facility.latitude, facility.longitude);
    } catch {
      failures.push(
        `${dataset.name} coordinate is outside the Seoul sanity range: ${facility.id}`,
      );
    }
  }

  if (invalidCoordinates.length > 0) {
    failures.push(
      `${dataset.name} contains ${invalidCoordinates.length} non-finite coordinate record(s)`,
    );
  }

  const coordinateRange =
    latitudes.length === 0 || longitudes.length === 0
      ? "n/a"
      : `latitude ${Math.min(...latitudes)} ~ ${Math.max(...latitudes)}, longitude ${Math.min(...longitudes)} ~ ${Math.max(...longitudes)}`;

  console.log(`  Coordinate range: ${coordinateRange}`);
}

function printFileSizes(paths: readonly string[], failures: string[]): void {
  console.log("\nFile sizes:");

  for (const path of paths) {
    try {
      const bytes = statSync(path).size;
      console.log(
        `- ${path}: ${bytes.toLocaleString("en-US")} bytes (${(bytes / 1024).toFixed(2)} KB)`,
      );
    } catch (error) {
      failures.push(
        `Could not stat ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function printRequiredFieldAudit(dataset: ParsedDataset): void {
  const missing = countMissingFields(dataset.raw);
  console.log(
    `- ${dataset.name}: ${REQUIRED_FIELDS.map((field) => `${field}=${missing[field]}`).join(", ")}`,
  );
}

function printDuplicateAudit(
  dataset: ParsedDataset,
  failures: string[],
): void {
  const duplicateIds = findDuplicateValues(
    dataset.facilities.map((facility) => facility.id),
  );
  const duplicateSourceIds = findDuplicateValues(
    dataset.facilities.map((facility) => facility.sourceId),
  );

  console.log(
    `- ${dataset.name}: id groups=${duplicateIds.length}, sourceId groups=${duplicateSourceIds.length}`,
  );

  if (duplicateIds.length > 0) {
    failures.push(`${dataset.name} has duplicate id values: ${duplicateIds.join(", ")}`);
  }

  if (duplicateSourceIds.length > 0) {
    failures.push(
      `${dataset.name} has duplicate sourceId values: ${duplicateSourceIds.join(", ")}`,
    );
  }
}

function printCoordinateDuplicateAudit(dataset: ParsedDataset): void {
  const duplicateGroups = groupDuplicateCoordinates(dataset.facilities);

  console.log(
    `- ${dataset.name}: ${duplicateGroups.length} duplicate coordinate group(s) (informational)`,
  );

  for (const group of duplicateGroups.slice(0, MAX_COORDINATE_EXAMPLES)) {
    const members = group.facilities
      .map((facility) => `${facility.sourceId} / ${facility.name}`)
      .join(" | ");
    console.log(
      `  ${group.latitude}, ${group.longitude} → ${members}`,
    );
  }
}

function parseMetadata(
  raw: unknown,
  failures: string[],
): ReturnType<typeof metadataSchema.parse> | undefined {
  const parsed = metadataSchema.safeParse(raw);

  if (!parsed.success) {
    failures.push(
      `Metadata schema invalid: ${formatErrorIssues(parsed.error.issues)}`,
    );
    return undefined;
  }

  return parsed.data;
}

function parseAedReviewFiles(
  registryRaw: unknown,
  pendingRaw: unknown,
  failures: string[],
): { registry?: AedMobilityRegistry; pending?: AedPendingReview } {
  const registryParsed = aedMobilityRegistrySchema.safeParse(registryRaw);

  if (!registryParsed.success) {
    failures.push(
      `AED mobility registry schema invalid: ${formatErrorIssues(registryParsed.error.issues)}`,
    );
  }

  const pendingParsed = aedPendingReviewSchema.safeParse(pendingRaw);

  if (!pendingParsed.success) {
    failures.push(
      `AED pending review schema invalid: ${formatErrorIssues(pendingParsed.error.issues)}`,
    );
  }

  return {
    registry: registryParsed.success ? registryParsed.data : undefined,
    pending: pendingParsed.success ? pendingParsed.data : undefined,
  };
}

function auditMetadataConsistency(
  datasets: readonly ParsedDataset[],
  metadata: ReturnType<typeof metadataSchema.parse> | undefined,
  failures: string[],
): void {
  if (metadata === undefined) {
    return;
  }

  const metadataCounts = {
    FIRE_WATER: metadata.sources.fireWater.count,
    SHELTER: metadata.sources.shelter.count,
    AED: metadata.sources.aed.count,
    OTHER: metadata.sources.other.count,
  } satisfies Record<DatasetName, number>;

  console.log("\nMetadata consistency:");

  for (const dataset of datasets) {
    const matches = metadataCounts[dataset.name] === dataset.facilities.length;
    console.log(
      `- ${dataset.name}: metadata=${metadataCounts[dataset.name]}, rows=${dataset.facilities.length} → ${matches ? "MATCH" : "MISMATCH"}`,
    );

    if (!matches) {
      failures.push(`${dataset.name} metadata count does not match row count`);
    }
  }

  const datasetBreakdown = Object.values(metadata.sources.other.datasets ?? {}).reduce(
    (total, dataset) => total + dataset.count,
    0,
  );
  const otherBreakdownMatches =
    metadata.sources.other.datasets === undefined ||
    datasetBreakdown === metadata.sources.other.count;
  console.log(
    `- OTHER dataset breakdown: ${datasetBreakdown} → ${otherBreakdownMatches ? "MATCH" : "MISMATCH"}`,
  );

  if (!otherBreakdownMatches) {
    failures.push("OTHER dataset breakdown does not sum to OTHER count");
  }
}

function auditAedMobility(
  aedFacilities: readonly Facility[] | undefined,
  registry: AedMobilityRegistry | undefined,
  pending: AedPendingReview | undefined,
  failures: string[],
): void {
  console.log("\nAED Mobility:");

  if (aedFacilities === undefined || registry === undefined || pending === undefined) {
    console.log("- Mobility details unavailable because an input failed validation");
    return;
  }

  const publishedSourceIds = new Set(
    aedFacilities.map((facility) => facility.sourceId),
  );
  const reviewedMobile = registry.decisions.filter(
    (decision) => decision.mobility === "MOBILE",
  );
  const pendingSourceIds = pending.candidates.map(
    (candidate) => candidate.sourceId,
  );
  const publishedMobileOverlap = reviewedMobile.filter((decision) =>
    publishedSourceIds.has(decision.sourceId),
  );
  const pendingPublishedOverlap = pending.candidates.filter((candidate) =>
    publishedSourceIds.has(candidate.sourceId),
  );

  console.log(`- Published FIXED: ${aedFacilities.length}`);
  console.log(`- Reviewed MOBILE: ${reviewedMobile.length}`);
  console.log(`- Pending: ${pending.candidates.length}`);
  console.log(
    `- MOBILE sourceIds: ${reviewedMobile.length === 0 ? "none" : reviewedMobile.map((decision) => `${decision.sourceId}${decision.note === undefined ? "" : ` / ${decision.note}`}`).join(" | ")}`,
  );
  console.log(
    `- Pending sourceIds: ${pendingSourceIds.length === 0 ? "none" : pendingSourceIds.join(", ")}`,
  );

  if (publishedMobileOverlap.length > 0) {
    failures.push(
      `Published AED contains reviewed MOBILE sourceId(s): ${publishedMobileOverlap.map((decision) => decision.sourceId).join(", ")}`,
    );
  }

  if (pendingPublishedOverlap.length > 0) {
    failures.push(
      `Published AED contains pending sourceId(s): ${pendingPublishedOverlap.map((candidate) => candidate.sourceId).join(", ")}`,
    );
  }
}

function run(): void {
  const failures: string[] = [];
  const definitions: DatasetDefinition[] = [
    {
      name: "FIRE_WATER",
      path: FIRE_WATER_OUTPUT_PATH,
      schema: fireWaterFacilitiesSchema,
    },
    {
      name: "SHELTER",
      path: SHELTER_OUTPUT_PATH,
      schema: shelterFacilitiesSchema,
    },
    {
      name: "AED",
      path: AED_OUTPUT_PATH,
      schema: aedFacilitiesSchema,
    },
    {
      name: "OTHER",
      path: OTHER_OUTPUT_PATH,
      schema: otherFacilitiesSchema,
    },
  ];
  const datasets = definitions
    .map((definition) => parseDataset(definition, failures))
    .filter((dataset): dataset is ParsedDataset => dataset !== undefined);
  const metadataRaw = readRequiredJson(METADATA_OUTPUT_PATH, failures);
  const metadata =
    metadataRaw === undefined
      ? undefined
      : parseMetadata(metadataRaw, failures);
  const registryRaw = readRequiredJson(AED_REVIEW_PATH, failures);
  const pendingRaw = readRequiredJson(AED_PENDING_REVIEW_PATH, failures);
  const { registry, pending } = parseAedReviewFiles(
    registryRaw,
    pendingRaw,
    failures,
  );

  console.log("Published Data Audit\n");
  console.log("Dataset counts:");

  let total = 0;

  for (const name of DATASET_NAMES) {
    const dataset = datasets.find((candidate) => candidate.name === name);
    const count = dataset?.facilities.length ?? 0;
    total += count;
    console.log(`- ${name}: ${count.toLocaleString("en-US")}`);
  }

  console.log(`- Total: ${total.toLocaleString("en-US")}`);

  printFileSizes(
    [
      FIRE_WATER_OUTPUT_PATH,
      SHELTER_OUTPUT_PATH,
      AED_OUTPUT_PATH,
      OTHER_OUTPUT_PATH,
      METADATA_OUTPUT_PATH,
    ],
    failures,
  );

  console.log("\nMissing required fields:");
  for (const dataset of datasets) {
    printRequiredFieldAudit(dataset);
    const missing = countMissingFields(dataset.raw);

    for (const field of REQUIRED_FIELDS) {
      if (missing[field] > 0) {
        failures.push(
          `${dataset.name} has ${missing[field]} missing ${field} value(s)`,
        );
      }
    }
  }

  console.log("\nDuplicate identifiers:");
  const allFacilities = datasets.flatMap((dataset) => [...dataset.facilities]);
  const globalDuplicateIds = findDuplicateValues(
    allFacilities.map((facility) => facility.id),
  );
  console.log(`- Global id groups: ${globalDuplicateIds.length}`);

  if (globalDuplicateIds.length > 0) {
    failures.push(`Global duplicate id values: ${globalDuplicateIds.join(", ")}`);
  }

  for (const dataset of datasets) {
    printDuplicateAudit(dataset, failures);
  }

  console.log("\nCoordinate ranges:");
  for (const dataset of datasets) {
    console.log(`- ${dataset.name}:`);
    printCoordinateRanges(dataset, failures);
  }

  console.log("\nDuplicate coordinates:");
  for (const dataset of datasets) {
    printCoordinateDuplicateAudit(dataset);
  }

  auditAedMobility(
    datasets.find((dataset) => dataset.name === "AED")?.facilities,
    registry,
    pending,
    failures,
  );
  auditMetadataConsistency(datasets, metadata, failures);

  if (failures.length > 0) {
    console.error("\nPublished data audit failed");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nPublished data audit passed");
}

run();
