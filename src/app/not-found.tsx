import Link from "next/link";

import { buttonClassName } from "@/shared/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-6 py-12">
      <section className="w-full max-w-md text-center">
        <p className="mb-3 text-sm font-semibold text-zinc-500">404</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          페이지를 찾을 수 없습니다.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          요청한 주소가 변경되었거나 존재하지 않습니다.
        </p>
        <div className="mt-6">
          <Link href="/" className={buttonClassName()}>
            지도로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}
