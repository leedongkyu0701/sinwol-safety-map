"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { useCurrentLocation } from "@/features/current-location/hooks/use-current-location";
import { useFacilities } from "@/features/facilities/hooks/use-facilities";
import { EmergencyNearbyResults } from "@/features/emergency-mode/components/emergency-nearby-results";
import {
  getNearestEmergencyFacilities,
  type EmergencyTarget,
} from "@/features/emergency-mode/lib/get-nearest-emergency-facilities";
import { Spinner } from "@/shared/ui/spinner";

const locationErrors = {
  denied: [
    "현재 위치 권한이 필요합니다.",
    "위치 권한을 허용한 뒤 다시 시도해주세요.",
  ],
  unavailable: ["현재 위치를 확인할 수 없습니다.", "다시 시도해주세요."],
  timeout: ["위치 확인 시간이 초과되었습니다.", "다시 시도해주세요."],
  error: ["위치 확인 중 오류가 발생했습니다.", "다시 시도해주세요."],
} as const;

function PhoneIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16.4v3a2 2 0 0 1-2.2 2A18.5 18.5 0 0 1 2.6 5.2 2 2 0 0 1 4.6 3h3a2 2 0 0 1 2 1.7l.4 2.5a2 2 0 0 1-.6 1.8L7.8 10.6a15 15 0 0 0 5.6 5.6l1.6-1.6a2 2 0 0 1 1.8-.6l2.5.4a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

function ActionContent({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="mx-auto grid w-full max-w-72 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 text-left">
      <span className="grid size-9 place-items-center">{icon}</span>
      <span>{children}</span>
    </span>
  );
}

export function EmergencyMode() {
  const [target, setTarget] = useState<EmergencyTarget | null>(null);
  const facilityState = useFacilities();
  const currentLocation = useCurrentLocation();
  const requesting = currentLocation.status === "requesting";
  const locationError =
    currentLocation.status in locationErrors
      ? locationErrors[currentLocation.status as keyof typeof locationErrors]
      : null;

  const results = useMemo(
    () =>
      target !== null &&
      facilityState.status === "ready" &&
      currentLocation.location !== null
        ? getNearestEmergencyFacilities(
            facilityState.facilities,
            target,
            currentLocation.location,
          )
        : [],
    [target, facilityState, currentLocation.location],
  );

  const selectTarget = (nextTarget: EmergencyTarget) => {
    if (requesting) return;
    setTarget(nextTarget);
    if (currentLocation.location === null && facilityState.status !== "error") {
      currentLocation.requestLocation();
    }
  };

  return (
    <main className="min-h-dvh bg-white text-zinc-950">
      <header className="h-16 border-b border-zinc-200">
        <div className="mx-auto flex h-full max-w-lg items-center gap-2 px-4">
          <Link href="/" aria-label="일반 지도로 돌아가기" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-800 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <h1 className="text-lg font-bold">긴급모드</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pb-10 pt-6 sm:px-6">
        <p className="mb-5 text-base font-medium text-zinc-600">필요한 도움을 바로 선택하세요</p>

        <div className="space-y-3">
          <a href="tel:119" className="flex min-h-22 w-full items-center rounded-xl bg-red-500 px-5 text-xl font-bold text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">
            <ActionContent icon={<PhoneIcon />}>119 전화하기</ActionContent>
          </a>
          <a href="tel:112" className="flex min-h-22 w-full items-center rounded-xl bg-blue-900 px-5 text-xl font-bold text-white transition-colors hover:bg-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
            <ActionContent icon={<PhoneIcon />}>112 전화하기</ActionContent>
          </a>
          <button type="button" onClick={() => selectTarget("AED")} disabled={requesting} aria-pressed={target === "AED"} className="flex min-h-22 w-full items-center rounded-xl border border-zinc-200 bg-white px-5 text-lg font-semibold text-zinc-950 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
            <ActionContent icon={<Image src="/icons/facilities/aed.svg" alt="" aria-hidden="true" width={36} height={36} />}>
              가까운 AED 찾기
            </ActionContent>
          </button>
          <button type="button" onClick={() => selectTarget("SHELTER")} disabled={requesting} aria-pressed={target === "SHELTER"} className="flex min-h-22 w-full items-center rounded-xl border border-zinc-200 bg-white px-5 text-lg font-semibold text-zinc-950 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
            <ActionContent icon={<Image src="/icons/facilities/shelter.svg" alt="" aria-hidden="true" width={36} height={36} />}>
              민방위 대피시설 찾기
            </ActionContent>
          </button>
        </div>

        <p className="mt-6 text-center text-sm leading-5 text-zinc-500">전화 버튼을 누르면 기기의 통화 화면이 열립니다.</p>

        {target !== null ? (
          <section aria-live="polite" className="mt-8 border-t border-zinc-200 pt-6">
            <h2 className="mb-4 text-lg font-bold">가까운 {target === "AED" ? "AED" : "민방위 대피시설"}</h2>
            {facilityState.status === "error" ? (
              <p className="text-sm leading-6 text-zinc-700">시설 정보를 불러오지 못했습니다.<br />잠시 후 다시 시도해주세요.</p>
            ) : requesting ? (
              <p role="status" className="flex items-center gap-2 text-sm text-zinc-700"><Spinner className="size-5 border-zinc-300 border-t-blue-600" />현재 위치를 확인하는 중입니다.</p>
            ) : locationError !== null ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-zinc-700">{locationError[0]}<br />{locationError[1]}</p>
                <button type="button" onClick={currentLocation.requestLocation} className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">다시 위치 확인</button>
              </div>
            ) : facilityState.status === "loading" ? (
              <p role="status" className="text-sm text-zinc-700">시설 정보를 불러오는 중입니다.</p>
            ) : currentLocation.location !== null ? (
              <EmergencyNearbyResults results={results} />
            ) : null}
          </section>
        ) : null}

      </div>
    </main>
  );
}
