import Image from "next/image";

import { createFacilityDetailViewModel } from "@/features/facilities/lib/facility-detail-view-model";
import type { Facility } from "@/shared/types/facility";

interface FacilityDetailContentProps {
  facility: Facility;
}

export function FacilityDetailContent({
  facility,
}: FacilityDetailContentProps) {
  const detail = createFacilityDetailViewModel(facility);

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3 pr-10">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-zinc-100">
          <Image
            src={detail.iconPath}
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-700">
            {detail.categoryLabel}
          </p>
          <h2 className="mt-1 break-keep text-lg font-bold leading-snug text-zinc-950">
            {detail.title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{detail.subtypeLabel}</p>
        </div>
      </header>

      <section aria-labelledby="facility-address-heading">
        <h3
          id="facility-address-heading"
          className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
        >
          주소
        </h3>
        <p className="mt-1 break-keep text-sm leading-6 text-zinc-800">
          {detail.address}
        </p>
      </section>

      {detail.rows.length === 0 ? null : (
        <dl className="divide-y divide-zinc-100 border-y border-zinc-100">
          {detail.rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm"
            >
              <dt className="font-medium text-zinc-500">{row.label}</dt>
              <dd className="min-w-0 break-words text-zinc-900">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {detail.operatingHours.length === 0 ? null : (
        <section aria-labelledby="facility-hours-heading">
          <h3
            id="facility-hours-heading"
            className="text-sm font-bold text-zinc-900"
          >
            운영시간
          </h3>
          <dl className="mt-2 divide-y divide-zinc-100 rounded-xl bg-zinc-50 px-3">
            {detail.operatingHours.map((row) => (
              <div
                key={row.day}
                className="grid grid-cols-[5rem_1fr] gap-3 py-2.5 text-sm"
              >
                <dt className="font-medium text-zinc-600">{row.day}</dt>
                <dd className="text-zinc-900">{row.hours}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
