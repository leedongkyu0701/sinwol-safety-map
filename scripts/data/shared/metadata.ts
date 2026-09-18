import {
  metadataSchema,
  type DataMetadata,
  type SourceSummary,
} from "../../../src/shared/schemas/metadata";
import { readJsonFileIfExists } from "./write-json";

export type MetadataSourceKey = keyof DataMetadata["sources"];
export type SourceMetadata<Key extends MetadataSourceKey> =
  DataMetadata["sources"][Key];

const EMPTY_SOURCES: DataMetadata["sources"] = {
  fireWater: { count: 0 },
  shelter: { count: 0 },
  aed: { count: 0 },
  other: { count: 0 },
};

export function readMetadataIfExists(path: string): DataMetadata | undefined {
  const raw = readJsonFileIfExists(path);
  return raw === undefined ? undefined : metadataSchema.parse(raw);
}

export function updateSourceMetadata<Key extends MetadataSourceKey>(
  existing: DataMetadata | undefined,
  sourceKey: Key,
  sourceMetadata: SourceMetadata<Key>,
  options: {
    publishedDataChanged: boolean;
    generatedAt?: string;
  },
): DataMetadata {
  const previousSources = existing?.sources ?? EMPTY_SOURCES;
  const sources = {
    ...previousSources,
    [sourceKey]: sourceMetadata,
  };
  const sourceMetadataChanged =
    JSON.stringify(previousSources[sourceKey]) !== JSON.stringify(sourceMetadata);

  if (
    existing !== undefined &&
    !options.publishedDataChanged &&
    !sourceMetadataChanged
  ) {
    return existing;
  }

  return metadataSchema.parse({
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    sources,
  });
}

export function updateOtherDatasetMetadata(
  existing: DataMetadata | undefined,
  datasetKey: string,
  datasetMetadata: SourceSummary,
  options: {
    totalCount: number;
    publishedDataChanged: boolean;
    generatedAt?: string;
  },
): DataMetadata {
  const previousDatasets = existing?.sources.other.datasets ?? {};

  return updateSourceMetadata(
    existing,
    "other",
    {
      count: options.totalCount,
      datasets: {
        ...previousDatasets,
        [datasetKey]: datasetMetadata,
      },
    },
    {
      publishedDataChanged: options.publishedDataChanged,
      ...(options.generatedAt === undefined
        ? {}
        : { generatedAt: options.generatedAt }),
    },
  );
}
