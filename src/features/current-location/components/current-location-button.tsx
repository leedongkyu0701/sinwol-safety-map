import type { CurrentLocationStatus } from "@/features/current-location/types/user-location";
import { IconButton } from "@/shared/ui/icon-button";
import { Spinner } from "@/shared/ui/spinner";

interface CurrentLocationButtonProps {
  status: CurrentLocationStatus;
  onRequest: () => void;
}

export function CurrentLocationButton({
  status,
  onRequest,
}: CurrentLocationButtonProps) {
  const isRequesting = status === "requesting";
  const label = status === "ready" ? "현재 위치 다시 확인" : "현재 위치 보기";

  return (
    <IconButton
      aria-label={label}
      title={label}
      disabled={isRequesting}
      onClick={onRequest}
      className="size-12 border-zinc-300"
    >
      {isRequesting ? (
        <Spinner className="size-5 border-zinc-300 border-t-blue-600" />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
    </IconButton>
  );
}
