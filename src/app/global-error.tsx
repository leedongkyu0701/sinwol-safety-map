"use client";

import { useEffect } from "react";

import "@/app/globals.css";
import { Button } from "@/shared/ui/button";

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function GlobalErrorPage({
  error,
  retry,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error("[App] Root rendering failed.", error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <title>오류 | 신월동 안전지도</title>
        <main className="grid min-h-dvh place-items-center bg-zinc-50 px-6 py-12">
          <section role="alert" className="w-full max-w-md text-center">
            <p className="mb-3 text-sm font-semibold text-zinc-500">오류</p>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              서비스를 불러오지 못했습니다.
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              일시적인 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.
            </p>
            <div className="mt-6">
              <Button onClick={retry}>다시 시도</Button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
