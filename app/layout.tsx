import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "알레스인터네셔날 - 무역 재고관리 시스템",
  description: "해외 수입 무역업체를 위한 원가계산 및 재고관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-100">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 lg:ml-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
