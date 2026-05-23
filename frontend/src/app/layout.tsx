import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/lib/LanguageContext";

export const metadata: Metadata = {
  title: "SentinelPilot - AI 安全协处理器工作台",
  description: "自动化网络安全告警处置、全生命周期调查与响应阻断平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex text-neutral-800 bg-[#FCFAF6] overflow-y-auto font-sans">
        <LanguageProvider>
          <Sidebar />
          <main className="flex-1 min-h-screen pl-64 flex flex-col relative z-10">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
