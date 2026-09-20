"use client";

import {
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/shared/lib/cn";

export type BottomSheetSnap = "peek" | "expanded";

interface BottomSheetProps {
  snap: BottomSheetSnap;
  onSnapChange: (snap: BottomSheetSnap) => void;
  peekHeight: number;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

const FLICK_VELOCITY = 500;
const DRAG_THRESHOLD = 6;

export function BottomSheet({
  snap,
  onSnapChange,
  peekHeight,
  ariaLabel,
  children,
  className,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLElement>(null);
  const draggedRef = useRef(false);
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();
  const [panelHeight, setPanelHeight] = useState(0);
  const collapsedOffset = Math.max(0, panelHeight - peekHeight);

  useEffect(() => {
    const panel = panelRef.current;

    if (panel === null) {
      return;
    }

    const updateHeight = () =>
      setPanelHeight(panel.getBoundingClientRect().height);
    const observer = new ResizeObserver(updateHeight);

    updateHeight();
    observer.observe(panel);

    return () => observer.disconnect();
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    draggedRef.current = false;
    dragControls.start(event);
  };

  const handleDrag = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (Math.abs(info.offset.y) >= DRAG_THRESHOLD) {
      draggedRef.current = true;
    }
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.velocity.y <= -FLICK_VELOCITY) {
      onSnapChange("expanded");
      return;
    }

    if (info.velocity.y >= FLICK_VELOCITY) {
      onSnapChange("peek");
      return;
    }

    const startingOffset = snap === "expanded" ? 0 : collapsedOffset;
    const projectedOffset = startingOffset + info.offset.y;
    onSnapChange(
      projectedOffset < collapsedOffset / 2 ? "expanded" : "peek",
    );
  };

  const toggleSnap = () => {
    if (draggedRef.current) {
      return;
    }

    onSnapChange(snap === "peek" ? "expanded" : "peek");
  };

  return (
    <motion.aside
      ref={panelRef}
      aria-label={ariaLabel}
      className={cn(
        "absolute inset-x-0 bottom-0 z-30 flex h-[min(72dvh,42rem)] flex-col overflow-hidden rounded-t-3xl border border-b-0 border-zinc-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
        className,
      )}
      animate={{ y: snap === "expanded" ? 0 : collapsedOffset }}
      initial={false}
      style={{ visibility: panelHeight === 0 ? "hidden" : "visible" }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 40 }
      }
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: collapsedOffset }}
      dragElastic={0.04}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <button
        type="button"
        aria-label={snap === "peek" ? "시설 목록 펼치기" : "시설 목록 접기"}
        aria-expanded={snap === "expanded"}
        onPointerDown={handlePointerDown}
        onClick={toggleSnap}
        className="flex h-10 shrink-0 touch-none items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-10 rounded-full bg-zinc-300"
        />
      </button>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </motion.aside>
  );
}
