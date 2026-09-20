import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

type InputProps = ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none placeholder:text-zinc-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500",
        className,
      )}
      {...props}
    />
  );
}
