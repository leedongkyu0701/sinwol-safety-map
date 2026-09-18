import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

type SpinnerProps = ComponentProps<"span">;

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800",
        className,
      )}
      {...props}
    />
  );
}
