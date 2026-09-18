"use client";

import { useEffect } from "react";

import { Button } from "@/shared/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error("[App] Route rendering failed.", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-6 py-12">
      <section role="alert" className="w-full max-w-md text-center">
        <p className="mb-3 text-sm font-semibold text-zinc-500">오류</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          페이지를 표시하지 못했습니다.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 페이지를 새로고침해
          주세요.
        </p>
        <div className="mt-6">
          <Button onClick={retry}>다시 시도</Button>
        </div>
      </section>
    </main>
  );
}
