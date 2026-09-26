import { formatDistance } from "@/features/facilities/lib/facility-distance";
import type { EmergencyFacilityResult } from "@/features/emergency-mode/lib/get-nearest-emergency-facilities";

interface EmergencyNearbyResultsProps {
  results: readonly EmergencyFacilityResult[];
}

export function EmergencyNearbyResults({ results }: EmergencyNearbyResultsProps) {
  if (results.length === 0) {
    return <p className="text-sm leading-6 text-zinc-700">현재 데이터에서 가까운 시설을 찾지 못했습니다.</p>;
  }

  return (
    <ol className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
      {results.map(({ facility, distanceMeters }, index) => (
        <li key={facility.id} className="flex gap-3 px-4 py-4">
          <span className="w-5 shrink-0 font-semibold text-blue-700">{index + 1}.</span>
          <div className="min-w-0">
            <h3 className="break-keep text-base font-bold leading-6 text-zinc-950">{facility.name}</h3>
            <p className="mt-1 text-sm font-semibold text-blue-700">{formatDistance(distanceMeters)} · 직선거리</p>
            <p className="mt-1 break-keep text-sm leading-5 text-zinc-600">{facility.address}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
