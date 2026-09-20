import { FacilityDetailContent } from "@/features/facilities/components/facility-detail-content";
import { FacilityList } from "@/features/facilities/components/facility-list";
import { FacilitySearch } from "@/features/facilities/components/facility-search";
import type { FacilityResult } from "@/features/facilities/types/facility-result";
import type { Facility } from "@/shared/types/facility";
import { Button } from "@/shared/ui/button";

interface FacilitySidebarProps {
  results: readonly FacilityResult[];
  searchQuery: string;
  hasLocation: boolean;
  selectedFacility: Facility | null;
  onSelect: (facilityId: string) => void;
  onBack: () => void;
}

export function FacilitySidebar({
  results,
  searchQuery,
  hasLocation,
  selectedFacility,
  onSelect,
  onBack,
}: FacilitySidebarProps) {
  return (
    <aside
      aria-label="안전시설 탐색"
      className="flex h-full min-h-0 flex-col bg-white"
    >
      {selectedFacility === null ? (
        <>
          <div className="shrink-0 p-4">
            <FacilitySearch inputId="facility-search-desktop" />
          </div>
          <FacilityList
            results={results}
            searchQuery={searchQuery}
            hasLocation={hasLocation}
            onSelect={onSelect}
          />
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="mb-5 gap-2"
          >
            <span aria-hidden="true">←</span>
            목록으로
          </Button>
          <FacilityDetailContent facility={selectedFacility} />
        </div>
      )}
    </aside>
  );
}
