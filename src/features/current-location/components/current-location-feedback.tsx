import type { CurrentLocationStatus } from "@/features/current-location/types/user-location";

interface CurrentLocationFeedbackProps {
  status: CurrentLocationStatus;
}

const FEEDBACK: Partial<Record<CurrentLocationStatus, string>> = {
  denied: "위치 권한을 허용하면 가까운 시설을 확인할 수 있습니다.",
  unavailable: "현재 위치를 확인할 수 없습니다.",
  timeout: "위치 확인 시간이 초과되었습니다.",
  error: "현재 위치를 확인할 수 없습니다.",
};

export function CurrentLocationFeedback({
  status,
}: CurrentLocationFeedbackProps) {
  const message = FEEDBACK[status];

  if (message === undefined) {
    return null;
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="max-w-64 rounded-xl bg-zinc-950/90 px-3 py-2 text-xs font-medium leading-5 text-white shadow-lg"
    >
      {message}
    </p>
  );
}
