import Link from "next/link";

import { cn } from "@/shared/lib/cn";

interface InfoIconProps {
  className?: string;
  href?: string;
}

export function InfoIcon({ className, href = "/info" }: InfoIconProps) {
  return (
    <Link
      href={href}
      aria-label="서비스 정보 보기"
      title="서비스 정보 보기"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-md transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 10.5v5" />
        <circle cx="12" cy="7.5" r=".75" fill="currentColor" stroke="none" />
      </svg>
    </Link>
  );
}
