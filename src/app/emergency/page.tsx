import type { Metadata } from "next";

import { EmergencyMode } from "@/features/emergency-mode/components/emergency-mode";

export const metadata: Metadata = { title: "긴급모드 | 신월동 안전지도" };

export default function EmergencyPage() {
  return <EmergencyMode />;
}
