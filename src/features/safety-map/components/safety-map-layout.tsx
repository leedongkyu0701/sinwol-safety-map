import type { ReactNode } from "react";

interface SafetyMapLayoutProps {
  desktopHeader: ReactNode;
  mobileHeader: ReactNode;
  sidebar: ReactNode;
  mapCanvas: ReactNode;
  categoryFilter: ReactNode;
  locationControl: ReactNode;
  mobileSheet: ReactNode;
  statusOverlay: ReactNode;
}

export function SafetyMapLayout({
  desktopHeader,
  mobileHeader,
  sidebar,
  mapCanvas,
  categoryFilter,
  locationControl,
  mobileSheet,
  statusOverlay,
}: SafetyMapLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hidden shrink-0 lg:block">{desktopHeader}</div>

      <div className="relative min-h-0 flex-1 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="hidden min-h-0 border-r border-zinc-200 lg:block">
          {sidebar}
        </div>
        <div className="relative h-full min-h-0 overflow-hidden bg-zinc-100">
          <div className="absolute inset-x-0 top-0 bottom-[104px] isolate lg:bottom-0">
            {mapCanvas}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-[5.5rem] z-20 px-3 pt-3 lg:top-0">
            <div className="pointer-events-auto max-w-[calc(100%-3.5rem)]">
              {categoryFilter}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 px-3 pt-3 lg:hidden">
            <div className="pointer-events-auto">{mobileHeader}</div>
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
