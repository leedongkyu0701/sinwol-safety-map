"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { FacilityListItem } from "@/features/facilities/components/facility-list-item";
import type { FacilityResult } from "@/features/facilities/types/facility-result";

interface FacilityListProps {
  results: readonly FacilityResult[];
  searchQuery: string;
  hasLocation: boolean;
  onSelect: (facilityId: string) => void;
  headerAction?: ReactNode;
}

export function FacilityList({
  results,
  searchQuery,
  hasLocation,
  onSelect,
  headerAction,
}: FacilityListProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const getItemKey = useCallback(
    (index: number) => results[index]?.facility.id ?? index,
    [results],
  );
  // TanStack Virtual exposes an imperative virtualizer API by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 116,
    getItemKey,
    overscan: 6,
  });
  useEffect(() => {
    rowVirtualizer.scrollToOffset(0);
  }, [results, rowVirtualizer]);
  const hasSearchQuery = searchQuery.trim() !== "";
  const title = hasSearchQuery
    ? `검색 결과 ${results.length.toLocaleString("ko-KR")}곳`
    : hasLocation
      ? `주변 안전시설 ${results.length.toLocaleString("ko-KR")}곳`
      : `안전시설 ${results.length.toLocaleString("ko-KR")}곳`;

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={title}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-zinc-950">{title}</h2>
          {hasLocation && headerAction ? (
            <p className="text-xs font-medium text-zinc-500">거리순 · 직선거리</p>
          ) : null}
        </div>
        {headerAction ?? (hasLocation ? (
          <span className="text-xs font-medium text-zinc-500">
            거리순 · 직선거리
          </span>
        ) : null)}
      </header>
      <div
        ref={scrollElementRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {results.length === 0 ? (
          <div className="grid min-h-40 place-items-center px-6 text-center">
            <p className="text-sm leading-6 text-zinc-600">
              조건에 맞는 안전시설이 없습니다.
            </p>
          </div>
        ) : (
          <ul
            className="relative divide-y divide-zinc-100"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const result = results[virtualRow.index];

              return (
                <li
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <FacilityListItem
                    result={result}
                    onSelect={onSelect}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
