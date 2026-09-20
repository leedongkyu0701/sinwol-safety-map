import metadataJson from "../../../../public/data/metadata.json";

import { DATA_SOURCE_LINKS } from "@/features/service-info/config/data-source-links";
import { formatMetadataDate } from "@/features/service-info/lib/format-metadata-date";
import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";
import {
  metadataSchema,
  type DataMetadata,
  type SourceSummary,
} from "@/shared/schemas/metadata";
import type { FacilityCategory } from "@/shared/types/facility";

export interface ServiceInfoSource {
  category: FacilityCategory;
  label: string;
  count: number;
  source: string;
  sourceDate: string | null;
  sourceDateLabel: string;
  sourceUrl: string;
}

export interface ServiceInfoModel {
  generatedAt: string | null;
  totalCount: number;
  sources: ServiceInfoSource[];
}

interface ServiceInfoSnapshot {
  source?: string;
  sourceUpdatedAt?: string;
  fetchedAt?: string;
}

function toServiceInfoSnapshot(summary: SourceSummary): ServiceInfoSnapshot {
  return {
    source: summary.source,
    sourceUpdatedAt: summary.sourceUpdatedAt,
    fetchedAt: summary.fetchedAt,
  };
}

function getSourceDate(summary: ServiceInfoSnapshot | undefined): string | null {
  if (summary === undefined) {
    return null;
  }

  return summary.sourceUpdatedAt !== undefined
    ? formatMetadataDate(summary.sourceUpdatedAt, { dateOnly: true })
    : formatMetadataDate(summary.fetchedAt);
}

function readMetadata(): DataMetadata {
  return metadataSchema.parse(metadataJson);
}

export function buildServiceInfo(): ServiceInfoModel {
  const metadata = readMetadata();
  const fireOrgDataset = metadata.sources.other.datasets?.fireOrg;
  const sourceEntries: Array<{
    category: FacilityCategory;
    count: number;
    sourceDataset?: ServiceInfoSnapshot;
  }> = [
    {
      category: "FIRE_WATER",
      count: metadata.sources.fireWater.count,
      sourceDataset: toServiceInfoSnapshot(metadata.sources.fireWater),
    },
    {
      category: "SHELTER",
      count: metadata.sources.shelter.count,
      sourceDataset: toServiceInfoSnapshot(metadata.sources.shelter),
    },
    {
      category: "AED",
      count: metadata.sources.aed.count,
      sourceDataset: toServiceInfoSnapshot(metadata.sources.aed),
    },
    {
      category: "OTHER",
      count: metadata.sources.other.count,
      sourceDataset:
        fireOrgDataset === undefined
          ? undefined
          : toServiceInfoSnapshot(fireOrgDataset),
    },
  ];

  const sources = sourceEntries.map(({ category, count, sourceDataset }) => ({
    category,
    label: FACILITY_CATEGORY_CONFIG[category].label,
    count,
    source: sourceDataset?.source ?? "공식 공공데이터",
    sourceDate: getSourceDate(sourceDataset),
    sourceDateLabel:
      sourceDataset?.sourceUpdatedAt === undefined ? "수집일" : "원천 기준일",
    sourceUrl: DATA_SOURCE_LINKS[category],
  }));

  return {
    generatedAt: formatMetadataDate(metadata.generatedAt),
    totalCount: sources.reduce((total, source) => total + source.count, 0),
    sources,
  };
}
