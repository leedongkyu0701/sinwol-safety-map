import { IconButton } from "@/shared/ui/icon-button";

interface FacilityListBackButtonProps {
  onBack: () => void;
}

export function FacilityListBackButton({
  onBack,
}: FacilityListBackButtonProps) {
  return (
    <IconButton
      aria-label="목록으로 돌아가기"
      title="목록으로 돌아가기"
      onClick={onBack}
      className="size-10 border-0 shadow-none hover:bg-zinc-100"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </IconButton>
  );
}
