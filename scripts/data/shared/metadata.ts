import {
  metadataSchema,
  type DataMetadata,
} from "../../../src/shared/schemas/metadata";
import { readJsonFileIfExists } from "./write-json";

export type MetadataSourceKey = keyof DataMetadata["sources"];
export type SourceMetadata = DataMetadata["sources"][MetadataSourceKey];

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

export function updateSourceMetadata(
  existing: DataMetadata | undefined,
  sourceKey: MetadataSourceKey,
  sourceMetadata: SourceMetadata,
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
