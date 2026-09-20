import { Spinner } from "@/shared/ui/spinner";

export type SafetyMapStatus = "loading" | "ready" | "error";

interface SafetyMapStatusOverlayProps {
  status: SafetyMapStatus;
  message: string;
}

export function SafetyMapStatusOverlay({
  status,
  message,
}: SafetyMapStatusOverlayProps) {
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
        <p className="text-sm font-medium text-zinc-800">{message}</p>
      </div>
    </div>
  );
}
