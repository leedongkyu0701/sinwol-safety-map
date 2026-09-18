import type { RefObject } from "react";

interface MapCanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

export function MapCanvas({ containerRef }: MapCanvasProps) {
  return (
    <div
      ref={containerRef}
      aria-label="신월동 안전지도"
      className="h-full w-full"
    />
  );
}
