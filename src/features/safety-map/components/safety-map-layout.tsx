import type { ReactNode } from "react";

interface SafetyMapLayoutProps {
  mobileSearch: ReactNode;
  sidebar: ReactNode;
  mapCanvas: ReactNode;
  categoryFilter: ReactNode;
  locationControl: ReactNode;
  mobileSheet: ReactNode;
  statusOverlay: ReactNode;
}

export function SafetyMapLayout({
  mobileSearch,
  sidebar,
  mapCanvas,
  categoryFilter,
  locationControl,
  mobileSheet,
  statusOverlay,
}: SafetyMapLayoutProps) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <header className="relative z-40 border-b border-zinc-200 bg-white px-4 py-3 lg:flex lg:h-16 lg:items-center lg:px-5 lg:py-0">
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
          신월동 안전지도
        </h1>
        <div className="mt-3 lg:hidden">{mobileSearch}</div>
      </header>

      <div className="relative min-h-0 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="hidden min-h-0 border-r border-zinc-200 lg:block">
          {sidebar}
        </div>
        <div className="relative h-full min-h-0 overflow-hidden bg-zinc-100">
          <div className="absolute inset-x-0 top-0 bottom-[104px] isolate lg:bottom-0">
            {mapCanvas}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3">
            <div className="pointer-events-auto max-w-[calc(100%-3.5rem)]">
              {categoryFilter}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-28 right-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-2 lg:bottom-16 lg:right-4">
            <div className="pointer-events-auto">{locationControl}</div>
          </div>
          {mobileSheet}
          {statusOverlay}
        </div>
      </div>
    </div>
  );
}
