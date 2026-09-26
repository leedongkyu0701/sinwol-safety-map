import Link from "next/link";

export function EmergencyModeLink() {
  return (
    <Link
      href="/emergency"
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16.4v3a2 2 0 0 1-2.2 2A18.5 18.5 0 0 1 2.6 5.2 2 2 0 0 1 4.6 3h3a2 2 0 0 1 2 1.7l.4 2.5a2 2 0 0 1-.6 1.8L7.8 10.6a15 15 0 0 0 5.6 5.6l1.6-1.6a2 2 0 0 1 1.8-.6l2.5.4a2 2 0 0 1 1.7 2Z" />
      </svg>
      긴급모드
    </Link>
  );
}
