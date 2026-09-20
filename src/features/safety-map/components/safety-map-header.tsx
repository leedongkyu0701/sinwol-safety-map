import type { ReactNode } from "react";

import { InfoIcon } from "@/features/safety-map/components/info-icon";

interface SafetyMapHeaderProps {
  mobileSearch?: ReactNode;
  variant: "desktop" | "mobile";
}

export function SafetyMapHeader({
  mobileSearch,
  variant,
}: SafetyMapHeaderProps) {
  if (variant === "desktop") {
    return (
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-5">
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
          신월동 안전지도
        </h1>
        <InfoIcon className="size-10 rounded-md border-0 bg-transparent text-zinc-700 shadow-none hover:bg-zinc-100 hover:text-zinc-950" />
      </header>
    );
  }

  return (
    <header className="flex h-[68px] min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200/90 bg-white/95 px-3 shadow-[0_4px_18px_rgba(15,23,42,0.14)] backdrop-blur-sm">
      <h1 className="max-w-[8.5rem] shrink truncate text-[17px] font-extrabold tracking-tight text-zinc-950">
        신월동 안전지도
      </h1>
      <span aria-hidden="true" className="h-7 w-px shrink-0 bg-zinc-200" />
      <div className="min-w-0 flex-1">{mobileSearch}</div>
      <InfoIcon className="size-10 border-0 bg-transparent shadow-none" />
    </header>
  );
}
