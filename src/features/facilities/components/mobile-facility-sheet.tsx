import { FacilityListBackButton } from "@/features/facilities/components/facility-list-back-button";
import { FacilityDetailContent } from "@/features/facilities/components/facility-detail-content";
import { FacilityList } from "@/features/facilities/components/facility-list";
import { EmergencyModeLink } from "@/features/emergency-mode/components/emergency-mode-link";
import type { FacilityResult } from "@/features/facilities/types/facility-result";
import type { Facility } from "@/shared/types/facility";
import { BottomSheet, type BottomSheetSnap } from "@/shared/ui/bottom-sheet";

interface MobileFacilitySheetProps {
  results: readonly FacilityResult[];
  searchQuery: string;
  hasLocation: boolean;
  selectedFacility: Facility | null;
  onSelect: (facilityId: string) => void;
  onBack: () => void;
  snap: BottomSheetSnap;
  onSnapChange: (snap: BottomSheetSnap) => void;
}

const PEEK_HEIGHT = 104;

export function MobileFacilitySheet({
  results,
  searchQuery,
  hasLocation,
  selectedFacility,
  onSelect,
  onBack,
  snap,
  onSnapChange,
}: MobileFacilitySheetProps) {
  return (
    <div className="lg:hidden">
      <BottomSheet
        snap={snap}
        onSnapChange={onSnapChange}
        peekHeight={PEEK_HEIGHT}
        ariaLabel="안전시설 목록과 상세"
      >
        {selectedFacility === null ? (
          <FacilityList
            results={results}
            searchQuery={searchQuery}
            hasLocation={hasLocation}
            onSelect={onSelect}
            headerAction={<EmergencyModeLink />}
          />
        ) : (
          <div className="h-full overflow-y-auto overscroll-contain px-5 pb-8">
            <div className="mb-5 flex justify-start">
              <FacilityListBackButton onBack={onBack} />
            </div>
            <FacilityDetailContent facility={selectedFacility} />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
