import type { RefObject } from "react";

import { cn } from "@/shared/lib/cn";

interface MapCanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
  className?: string;
}

export function MapCanvas({ containerRef, className }: MapCanvasProps) {
  return (
    <div
      ref={containerRef}
      aria-label="신월동 안전지도"
      className={cn("h-full w-full", className)}
    />
  );
}
