import type { NaverMapStatus } from "@/features/safety-map/hooks/use-naver-map";
import { Spinner } from "@/shared/ui/spinner";

interface MapStatusOverlayProps {
  status: NaverMapStatus;
}

export function MapStatusOverlay({ status }: MapStatusOverlayProps) {
  if (status === "ready") {
    return null;
  }

  const isError = status === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className="absolute inset-0 z-10 grid place-items-center bg-white/90 px-6 text-center"
    >
      <div>
        {isError ? null : <Spinner className="mx-auto mb-4" />}
        <p className="text-sm font-medium text-zinc-800">
          {isError
            ? "지도를 불러오지 못했습니다."
            : "지도를 불러오는 중입니다."}
        </p>
      </div>
    </div>
  );
}
