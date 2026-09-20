import type { ReactNode } from "react";

import { ServiceInfoHeader } from "@/features/service-info/components/service-info-content";

export function PrivacyPolicyContent() {
  return (
    <>
      <a
        href="#privacy-policy-main"
        className="sr-only z-50 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
      >
        본문으로 건너뛰기
      </a>
      <main
        id="privacy-policy-main"
        aria-labelledby="privacy-policy-title"
        className="min-h-dvh w-full overflow-x-hidden bg-zinc-100/80 px-3 py-3 text-zinc-950 sm:px-6 sm:py-8"
      >
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <ServiceInfoHeader
            mobileTitle="개인정보 처리방침"
            backHref="/info"
            backLabel="서비스 정보"
          />

          <div className="w-full px-5 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <section className="max-w-3xl" aria-labelledby="privacy-policy-title">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                SINWOL SAFETY MAP
              </p>
              <h1
                id="privacy-policy-title"
                className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 text-balance sm:text-4xl"
              >
                개인정보 처리방침
              </h1>
              <p className="mt-4 break-words text-sm leading-7 text-zinc-600 sm:text-base">
                현재 서비스에서 처리하는 정보와 이용 범위를 안내합니다.
              </p>
            </section>

            <div className="mt-10 max-w-3xl space-y-6">
              <PrivacySection title="1. 처리하는 정보와 이용 목적">
                <PrivacyRow title="현재 위치">
                  현재 위치 기능을 실행하고 브라우저 권한을 허용한 경우 위도·경도·
                  정확도를 확인합니다. 지도에 현재 위치를 표시하고 시설까지의
                  직선거리를 계산하는 데 사용합니다.
                </PrivacyRow>
                <PrivacyRow title="회원정보">
                  회원가입·로그인 기능이 없어 이름·이메일·전화번호 등 회원정보를
                  서비스 기능을 위해 수집하지 않습니다.
                </PrivacyRow>
              </PrivacySection>

              <PrivacySection title="2. 보유 및 파기">
                <PrivacyRow title="현재 위치">
                  위치 좌표는 신월동 안전지도의 자체 서버·데이터베이스·쿠키 또는
                  브라우저 저장소에 저장하지 않습니다. 페이지를 종료하거나
                  새로고침하면 현재 페이지의 메모리에서 사라집니다.
                </PrivacyRow>
              </PrivacySection>

              <PrivacySection title="3. 외부 서비스 이용">
                <PrivacyRow title="지도 표시">
                  지도 표시를 위해 NAVER Maps JavaScript API를 사용합니다.
                </PrivacyRow>
                <PrivacyRow title="서비스 제공">
                  웹서비스 제공 과정에서 호스팅 제공자의 시스템을 이용합니다.
                </PrivacyRow>
                <p className="px-4 py-4 text-sm leading-6 text-zinc-600">
                  외부 서비스의 처리에는 각 제공자의 정책이 적용될 수 있습니다.
                </p>
              </PrivacySection>

              <PrivacySection title="4. 자동 수집 및 분석 도구">
                <PrivacyRow title="현재 사용 여부">
                  현재 별도의 사용자 행동 분석, 광고 추적 또는 오류 추적 도구를
                  사용하지 않습니다.
                </PrivacyRow>
              </PrivacySection>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function PrivacySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const headingId = `privacy-section-${title.replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3">
        <h2
          id={headingId}
          className="text-xl font-extrabold tracking-tight text-zinc-950 text-balance"
        >
          {title}
        </h2>
      </div>
      <div className="min-w-0 w-full max-w-full divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
        {children}
      </div>
    </section>
  );
}

function PrivacyRow({
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
