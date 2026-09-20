import { FacilityDetailContent } from "@/features/facilities/components/facility-detail-content";
import type { Facility } from "@/shared/types/facility";
import { Button } from "@/shared/ui/button";

interface FacilityDetailPanelProps {
  facility: Facility;
  onClose: () => void;
}

export function FacilityDetailPanel({
  facility,
  onClose,
}: FacilityDetailPanelProps) {
  return (
    <aside
      aria-label="선택한 시설 상세"
      data-selected-facility-id={facility.id}
      className="absolute bottom-12 left-3 right-3 z-20 max-h-[min(32rem,calc(100dvh-8rem))] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:bottom-auto sm:left-4 sm:right-auto sm:top-20 sm:w-[min(23rem,calc(100vw-2rem))] sm:max-h-[calc(100dvh-6rem)]"
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-label="시설 상세 닫기"
        onClick={onClose}
        className="absolute right-4 top-4 size-11 rounded-full p-0 text-xl leading-none"
      >
        <span aria-hidden="true">×</span>
      </Button>
      <FacilityDetailContent facility={facility} />
    </aside>
  );
}
