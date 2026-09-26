import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { buildServiceInfo } from "@/features/service-info/lib/build-service-info";
import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function ServiceInfoContent() {
  const info = buildServiceInfo();

  return (
    <>
      <a
        href="#service-info-main"
        className="sr-only z-50 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
      >
        본문으로 건너뛰기
      </a>
      <main
        id="service-info-main"
        aria-labelledby="service-info-title"
        className="min-h-dvh w-full overflow-x-hidden bg-zinc-100/80 px-3 py-3 text-zinc-950 sm:px-6 sm:py-8"
      >
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <ServiceInfoHeader />

          <div className="w-full px-5 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <section className="max-w-3xl" aria-labelledby="service-info-title">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                SINWOL SAFETY MAP
              </p>
              <h1
                id="service-info-title"
                className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 text-balance sm:text-4xl"
              >
                서비스 정보
              </h1>
              <p className="mt-4 break-words text-sm leading-7 text-zinc-600 sm:text-base">
                공공데이터로 정리한 신월동 안전시설을 지도에서 확인할 수 있습니다.
              </p>
            </section>

            <div className="mt-10 grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
              <div className="min-w-0 space-y-6">
                <InfoSection
                  title="데이터 현황"
                  description="현재 지도에 반영된 시설 현황입니다."
                >
                  <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
                    <SummaryCard
                      label="제공 시설"
                      value={`${numberFormatter.format(info.totalCount)}곳`}
                    />
                    <SummaryCard
                      label="서비스 반영일"
                      value={info.generatedAt ?? "확인할 수 없음"}
                    />
                  </div>

                  <div className="mt-4 min-w-0 w-full max-w-full divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
                    {info.categorySummaries.map((source) => {
                      const category = FACILITY_CATEGORY_CONFIG[source.category];

                      return (
                        <div
                          key={source.category}
                          className="grid min-h-16 min-w-0 w-full max-w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100">
                            <Image
                              src={category.iconPath}
                              alt=""
                              aria-hidden="true"
                              width={24}
                              height={24}
                              sizes="24px"
                            />
                          </span>
                          <span className="min-w-0 text-sm font-semibold text-zinc-900">
                            {source.label}
                          </span>
                          <span className="ml-auto shrink-0 tabular-nums text-sm font-bold text-zinc-950">
                            {numberFormatter.format(source.count)}곳
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </InfoSection>

                <InfoSection
                  title="데이터 출처 및 갱신 기준"
                  description="출처별 공개 자료와 갱신일을 표시합니다."
                >
                  <div className="min-w-0 w-full max-w-full divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
                    {info.sourceDetails.map((source) => (
                      <div
                        key={source.key}
                        className="grid gap-2 px-4 py-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-start sm:gap-5"
                      >
                        <span className="text-sm font-bold text-zinc-900">
                          {source.label}
                        </span>
                        <div className="min-w-0">
                          <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-start gap-1 text-sm font-medium leading-6 text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-950 hover:decoration-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                          >
                            <span className="break-words">{source.source}</span>
                            <ExternalLinkIcon />
                          </a>
                          {source.sourceDate === null ? null : (
                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                              {source.sourceDateLabel}: {source.sourceDate}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </InfoSection>
              </div>

              <div className="min-w-0 space-y-6">
                <InfoSection
                  title="이용 안내"
                  description="시설 정보를 확인할 때 참고할 사항입니다."
                >
                  <div className="min-w-0 w-full max-w-full divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
                    <PolicyRow title="데이터 최신성">
                      원천 데이터의 갱신 시점에 따라 시설 위치, 명칭 또는 운영 상태가
                      실제와 다를 수 있습니다.
                    </PolicyRow>
                    <PolicyRow title="시설 기준">
                      대피시설은 사용중으로 확인된 시설만 표시합니다. AED 위치와
                      운영시간은 원천 자료 기준의 참고 정보입니다.
                    </PolicyRow>
                    <PolicyRow title="자료 출처 및 이용 조건">
                      아동안전지킴이집 정보는 경찰청 안전Dream 자료이며, 출처를
                      표시하고 비상업적 용도로 제공합니다.
                    </PolicyRow>
                    <PolicyRow title="긴급 상황">
                      긴급 신고와 출동 접수는 119 등 관계기관에 요청해 주세요.
                    </PolicyRow>
                  </div>
                </InfoSection>

                <InfoSection
                  title="위치정보 이용 안내"
                  description="현재 위치 기능은 선택 사항입니다."
                >
                  <div className="min-w-0 w-full max-w-full divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
                    <PolicyRow title="사용 시점">
                      현재 위치 버튼을 누르고 브라우저 권한을 허용한 경우에만
                      위치를 확인합니다.
                    </PolicyRow>
                    <PolicyRow title="이용 목적">
                      지도 중심을 이동하고 시설까지의 직선거리를 계산하는 데
                      사용합니다.
                    </PolicyRow>
                    <PolicyRow title="앱 내 처리">
                      서비스 자체 서버나 브라우저 저장소에 위치를 보관하지 않습니다.
                      현재 페이지 기능에 필요한 동안만 메모리에서 사용합니다.
                    </PolicyRow>
                    <PolicyRow title="권한 관리">
                      위치 권한과 정확도는 브라우저와 운영체제 설정에 따라 달라집니다.
                    </PolicyRow>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    브라우저, 지도 SDK, 호스팅 제공자의 처리에는 각 제공자의 정책이
                    적용될 수 있습니다.
                  </p>
                </InfoSection>
              </div>
            </div>

            <nav
              aria-label="서비스 문서"
              className="mt-10 border-t border-zinc-200 pt-5 text-sm text-zinc-500"
            >
              <Link
                href="/privacy"
                className="underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-950 hover:decoration-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
              >
                개인정보 처리방침
              </Link>
            </nav>
          </div>
        </div>
      </main>
    </>
  );
}

export function ServiceInfoHeader({
  mobileTitle = "서비스 정보",
  backHref = "/",
  backLabel = "지도로 돌아가기",
}: {
  mobileTitle?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="min-h-16 border-b border-zinc-200 px-5 sm:px-8">
      <div className="flex min-h-16 items-center justify-between sm:hidden">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="inline-flex size-11 items-center justify-start text-zinc-950 transition-colors hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        >
          <BackIcon />
        </Link>
        <span className="text-base font-extrabold tracking-tight text-zinc-950">
          {mobileTitle}
        </span>
        <span aria-hidden="true" className="size-11" />
      </div>
      <div className="hidden min-h-16 items-center justify-between sm:flex">
        <Link
          href="/"
          className="text-base font-extrabold tracking-tight text-zinc-950 transition-colors hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        >
          신월동 안전지도
        </Link>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-zinc-950 transition-colors hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        >
          <BackIcon />
          {backLabel}
        </Link>
      </div>
    </header>
  );
}

function InfoSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = `service-info-section-${title.replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3">
        <h2
          id={headingId}
          className="text-xl font-extrabold tracking-tight text-zinc-950 text-balance"
        >
          {title}
        </h2>
        {description === undefined ? null : (
          <p className="mt-1.5 break-words text-sm leading-6 text-zinc-500">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-4">
      <p className="text-xs font-semibold text-zinc-500">{label}</p>
      <p className="mt-1.5 tabular-nums text-lg font-extrabold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function PolicyRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 px-4 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start sm:gap-5">
      <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
      <p className="min-w-0 text-sm leading-6 text-zinc-600">{children}</p>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-1 size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2.5H13.5V6.5" />
      <path d="m13.25 2.75-5.5 5.5" />
      <path d="M7 3.5H3.5v9h9V9" />
    </svg>
  );
}
