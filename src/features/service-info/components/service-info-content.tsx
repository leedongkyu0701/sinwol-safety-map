import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";
import { buildServiceInfo } from "@/features/service-info/lib/build-service-info";

export function ServiceInfoContent() {
  const info = buildServiceInfo();

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-4 text-zinc-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <header className="min-h-16 border-b border-zinc-200 px-5 sm:px-8">
          <div className="flex min-h-16 items-center justify-between sm:hidden">
            <Link
              href="/"
              aria-label="지도로 돌아가기"
              className="inline-flex size-11 items-center justify-start text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-extrabold tracking-tight text-blue-950">
              서비스 정보
            </h1>
            <span aria-hidden="true" className="size-11" />
          </div>
          <div className="hidden min-h-16 items-center justify-between sm:flex">
            <Link
              href="/"
              className="text-base font-extrabold tracking-tight text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              신월동 안전지도
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              지도로 돌아가기
            </Link>
          </div>
        </header>

        <div className="px-5 py-8 sm:px-10 sm:py-10">
          <section className="mb-10">
            <h1 className="text-2xl font-extrabold tracking-tight text-blue-950 sm:text-3xl">
              서비스 정보
            </h1>
            <p className="mt-3 max-w-3xl break-keep text-sm leading-7 text-blue-900/75 sm:text-base">
              신월동 안전지도는 서울특별시 양천구 신월동의 소방용수, 민방위
              대피시설, AED, 119안전센터 정보를 한 지도에서 확인할 수 있도록
              공공데이터를 정리해 제공합니다.
            </p>
          </section>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-10">
              <section>
                <SectionHeading>데이터 안내</SectionHeading>
                <div className="divide-y divide-zinc-200 border-y border-zinc-200">
                  <InfoRow label="데이터 생성일">
                    {info.generatedAt ?? "확인할 수 없음"}
                  </InfoRow>
                  <InfoRow label="제공 시설">
                    {info.totalCount.toLocaleString("ko-KR")}곳
                  </InfoRow>
                </div>
              </section>

              <section>
                <SectionHeading>제공 시설</SectionHeading>
                <div className="divide-y divide-zinc-200 border-y border-zinc-200">
                  {info.sources.map((source) => {
                    const category = FACILITY_CATEGORY_CONFIG[source.category];
                    return (
                      <div key={source.category} className="flex items-center gap-3 px-2 py-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100">
                          <Image src={category.iconPath} alt="" aria-hidden="true" width={26} height={26} />
                        </span>
                        <span className="font-bold text-zinc-900">{source.label}</span>
                        <span className="ml-auto text-sm font-semibold text-blue-700">
                          {source.count.toLocaleString("ko-KR")}곳
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <SectionHeading>데이터 출처</SectionHeading>
                <div className="divide-y divide-zinc-200 border-y border-zinc-200">
                  {info.sources.map((source) => (
                    <div key={source.category} className="grid gap-1 px-2 py-3 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-4">
                      <span className="text-sm font-bold text-zinc-900">{source.label}</span>
                      <div className="min-w-0">
                        <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="break-keep text-sm leading-6 text-blue-700 underline decoration-blue-200 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                          {source.source}
                        </a>
                        {source.sourceDate === null ? null : (
                          <p className="mt-1 text-xs text-zinc-500">
                            {source.sourceDateLabel}: {source.sourceDate}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-10 lg:border-l lg:border-zinc-200 lg:pl-12">
              <section>
                <SectionHeading>공공데이터 이용 안내</SectionHeading>
                <p className="break-keep text-sm leading-7 text-zinc-600 sm:text-base">
                  공공데이터 특성상 실제 현장의 위치·운영 상태와 차이가 있거나
                  최신 정보 반영이 늦을 수 있습니다. 긴급 상황에서는 현장 안내와
                  119 등 관계기관의 최신 안내를 우선 확인해주세요.
                </p>
              </section>

              <section>
                <SectionHeading>위치정보 이용</SectionHeading>
                <div className="divide-y divide-zinc-200 border-y border-zinc-200">
                  <InfoRow label="현재 위치 사용">
                    사용자가 현재 위치 버튼을 누르고 브라우저의 위치 권한을
                    허용한 경우에만 사용합니다.
                  </InfoRow>
                  <InfoRow label="서버 저장 안 함">
                    확인한 위치 좌표는 지도 이동과 시설까지의 직선거리 계산에만
                    사용하며 서버나 브라우저 저장소에 저장하지 않습니다.
                  </InfoRow>
                  <InfoRow label="서비스 이용">
                    로그인이나 회원가입 없이 이용할 수 있습니다.
                  </InfoRow>
                </div>
              </section>

              <section>
                <SectionHeading>안내</SectionHeading>
                <p className="break-keep text-sm leading-7 text-zinc-600 sm:text-base">
                  이 서비스는 공공기관이 제공한 데이터를 가공해 보여줍니다.
                  AED 위치와 운영시간을 포함한 원천 데이터의 갱신 시점에 따라
                  실제 시설 상황과 차이가 있을 수 있습니다.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg font-extrabold text-blue-950 sm:text-xl">{children}</h2>;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-2 py-3 sm:grid-cols-[7rem_1fr] sm:items-start sm:gap-4">
      <span className="text-sm font-bold text-zinc-900">{label}</span>
      <span className="break-keep text-sm leading-6 text-zinc-600">{children}</span>
    </div>
  );
}
