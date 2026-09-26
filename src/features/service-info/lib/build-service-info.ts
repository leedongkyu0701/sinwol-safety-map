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

export interface ServiceInfoCategorySummary {
  category: FacilityCategory;
  label: string;
  count: number;
}

export interface ServiceInfoSourceDetail {
  key: string;
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
  categorySummaries: ServiceInfoCategorySummary[];
  sourceDetails: ServiceInfoSourceDetail[];
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
  const categorySummaries: ServiceInfoCategorySummary[] = [
    {
      category: "FIRE_WATER",
      count: metadata.sources.fireWater.count,
      label: FACILITY_CATEGORY_CONFIG.FIRE_WATER.label,
    },
    {
      category: "SHELTER",
      count: metadata.sources.shelter.count,
      label: FACILITY_CATEGORY_CONFIG.SHELTER.label,
    },
    {
      category: "AED",
      count: metadata.sources.aed.count,
      label: FACILITY_CATEGORY_CONFIG.AED.label,
    },
    {
      category: "OTHER",
      count: metadata.sources.other.count,
      label: FACILITY_CATEGORY_CONFIG.OTHER.label,
    },
  ];
  const otherDatasets = metadata.sources.other.datasets ?? {};
  const sourceEntries: Array<{
    key: string;
    label: string;
    summary: SourceSummary | undefined;
    fallbackSource: string;
    sourceUrl: string;
  }> = [
    { key: "fireWater", label: "소방용수", summary: metadata.sources.fireWater, fallbackSource: "서울시 소방용수시설", sourceUrl: DATA_SOURCE_LINKS.fireWater },
    { key: "shelter", label: "민방위 대피시설", summary: metadata.sources.shelter, fallbackSource: "서울시 민방위 대피시설", sourceUrl: DATA_SOURCE_LINKS.shelter },
    { key: "aed", label: "자동심장충격기 (AED)", summary: metadata.sources.aed, fallbackSource: "국립중앙의료원", sourceUrl: DATA_SOURCE_LINKS.aed },
    { key: "fireOrg", label: "119안전센터", summary: otherDatasets.fireOrg, fallbackSource: "서울시 소방서 안전센터 구조대 위치정보", sourceUrl: DATA_SOURCE_LINKS.fireOrg },
    { key: "heatShelter", label: "무더위쉼터", summary: otherDatasets.heatShelter, fallbackSource: "서울시 무더위쉼터", sourceUrl: DATA_SOURCE_LINKS.heatShelter },
    { key: "childSafetyHouse", label: "아동안전지킴이집", summary: otherDatasets.childSafetyHouse, fallbackSource: "경찰청 안전Dream 아동안전지킴이집", sourceUrl: DATA_SOURCE_LINKS.childSafetyHouse },
  ];
  const sourceDetails = sourceEntries.map(({ key, label, summary, fallbackSource, sourceUrl }) => {
    const snapshot = summary === undefined ? undefined : toServiceInfoSnapshot(summary);
    return {
      key,
      label,
      count: key === "fireWater" ? metadata.sources.fireWater.count
        : key === "shelter" ? metadata.sources.shelter.count
          : key === "aed" ? metadata.sources.aed.count
            : summary?.count ?? 0,
      source: key === "childSafetyHouse"
        ? `${snapshot?.source ?? fallbackSource} [자료 출처: 경찰청]`
        : snapshot?.source ?? fallbackSource,
      sourceDate: getSourceDate(snapshot),
      sourceDateLabel: snapshot?.sourceUpdatedAt === undefined ? "수집일" : "원천 기준일",
      sourceUrl,
    };
  });

  return {
    generatedAt: formatMetadataDate(metadata.generatedAt),
    totalCount: categorySummaries.reduce((total, source) => total + source.count, 0),
    categorySummaries,
    sourceDetails,
  };
}
