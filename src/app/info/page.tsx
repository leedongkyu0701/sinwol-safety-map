import type { Metadata } from "next";

import { ServiceInfoContent } from "@/features/service-info/components/service-info-content";

export const metadata: Metadata = {
  title: "서비스 정보 | 신월동 안전지도",
  description: "신월동 안전지도의 데이터 출처와 위치정보 이용 안내입니다.",
};

export default function InfoPage() {
  return <ServiceInfoContent />;
}
