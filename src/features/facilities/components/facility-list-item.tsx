import Image from "next/image";

import { formatDistance } from "@/features/facilities/lib/facility-distance";
import type { FacilityResult } from "@/features/facilities/types/facility-result";
import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";

interface FacilityListItemProps {
  result: FacilityResult;
  onSelect: (facilityId: string) => void;
}

export function FacilityListItem({
  result,
  onSelect,
}: FacilityListItemProps) {
  const { facility, distanceMeters } = result;
  const category = FACILITY_CATEGORY_CONFIG[facility.category];
  const detailLocationLabel =
    facility.category === "AED" ? "설치 위치" : "상세 위치";

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(facility.id)}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-100">
          <Image
            src={category.iconPath}
            alt=""
            aria-hidden="true"
            width={30}
            height={30}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="break-keep text-[15px] font-bold leading-6 text-zinc-950">
              {facility.name}
            </span>
            {distanceMeters === undefined ? null : (
              <span className="shrink-0 pt-0.5 text-sm font-semibold text-blue-700">
                {formatDistance(distanceMeters)}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-sm font-medium text-zinc-600">
            {category.label}
          </span>
          <span className="mt-1 block break-keep text-sm leading-5 text-zinc-500">
            {facility.address}
          </span>
          {facility.detailLocation === undefined ? null : (
            <span className="mt-1 block break-keep text-sm leading-5 text-zinc-500">
              <span className="font-medium text-zinc-600">
                {detailLocationLabel}
              </span>
              {" · "}
              {facility.detailLocation}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
