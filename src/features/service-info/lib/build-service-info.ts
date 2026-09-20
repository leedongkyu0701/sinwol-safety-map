import metadataJson from "../../../../public/data/metadata.json";

import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";
import { metadataSchema, type DataMetadata, type SourceSummary } from "@/shared/schemas/metadata";
import type { FacilityCategory } from "@/shared/types/facility";
import { DATA_SOURCE_LINKS } from "@/features/service-info/config/data-source-links";
import { formatMetadataDate } from "@/features/service-info/lib/format-metadata-date";

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

function getSourceDate(summary: SourceSummary): string | null {
  return summary.sourceUpdatedAt !== undefined
    ? formatMetadataDate(summary.sourceUpdatedAt, { dateOnly: true })
    : formatMetadataDate(summary.fetchedAt);
}

function readMetadata(): DataMetadata {
  return metadataSchema.parse(metadataJson);
}

export function buildServiceInfo(): ServiceInfoModel {
  const metadata = readMetadata();
  const sourceEntries: Array<{
    category: FacilityCategory;
    summary: SourceSummary;
  }> = [
    { category: "FIRE_WATER", summary: metadata.sources.fireWater },
    { category: "SHELTER", summary: metadata.sources.shelter },
    { category: "AED", summary: metadata.sources.aed },
    {
      category: "OTHER",
      summary: {
        ...metadata.sources.other,
        source: metadata.sources.other.datasets?.fireOrg?.source,
        fetchedAt: metadata.sources.other.datasets?.fireOrg?.fetchedAt,
      },
    },
  ];

  const sources = sourceEntries.map(({ category, summary }) => ({
    category,
    label: FACILITY_CATEGORY_CONFIG[category].label,
    count: summary.count,
    source: summary.source ?? "공식 공공데이터",
    sourceDate: getSourceDate(summary),
    sourceDateLabel:
      summary.sourceUpdatedAt === undefined ? "수집일" : "원천 기준일",
    sourceUrl: DATA_SOURCE_LINKS[category],
  }));

  return {
    generatedAt: formatMetadataDate(metadata.generatedAt),
    totalCount: sources.reduce((total, source) => total + source.count, 0),
    sources,
  };
}
