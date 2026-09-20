import { useFacilityExplorerStore } from "@/features/facilities/store/use-facility-explorer-store";
import { IconButton } from "@/shared/ui/icon-button";
import { Input } from "@/shared/ui/input";

interface FacilitySearchProps {
  inputId: string;
  className?: string;
  onSearchStart?: () => void;
}

export function FacilitySearch({
  inputId,
  className,
  onSearchStart,
}: FacilitySearchProps) {
  const searchQuery = useFacilityExplorerStore((state) => state.searchQuery);
  const setSearchQuery = useFacilityExplorerStore(
    (state) => state.setSearchQuery,
  );

  return (
    <div className={className}>
      <label htmlFor={inputId} className="sr-only">
        시설명 또는 주소 검색
      </label>
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>
        <Input
          id={inputId}
          type="search"
          value={searchQuery}
          onChange={(event) => {
            const nextQuery = event.target.value;

            if (searchQuery.trim() === "" && nextQuery.trim() !== "") {
              onSearchStart?.();
            }

            setSearchQuery(nextQuery);
          }}
          placeholder="시설명·주소 검색"
          autoComplete="off"
          className="pl-10 pr-12 [&::-webkit-search-cancel-button]:hidden"
        />
        {searchQuery === "" ? null : (
          <IconButton
            aria-label="검색어 지우기"
            onClick={() => setSearchQuery("")}
            className="absolute right-1 top-1/2 size-9 -translate-y-1/2 border-0 shadow-none"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </IconButton>
        )}
      </div>
    </div>
  );
}
