import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "신월동 안전지도",
  description: "서울특별시 양천구 신월동의 공공 안전시설 지도",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
