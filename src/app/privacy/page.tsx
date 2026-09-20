import type { Metadata } from "next";

import { PrivacyPolicyContent } from "@/features/service-info/components/privacy-policy-content";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | 신월동 안전지도",
  description: "신월동 안전지도의 정보 처리 및 현재 위치 이용 안내입니다.",
};

export default function PrivacyPage() {
  return <PrivacyPolicyContent />;
}
