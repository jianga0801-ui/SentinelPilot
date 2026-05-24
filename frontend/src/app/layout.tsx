import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/lib/LanguageContext";
import { ThemeProvider } from "@/lib/ThemeContext";

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
      <body className="min-h-full flex text-foreground bg-background overflow-y-auto font-sans transition-colors duration-200">
        <LanguageProvider initialLanguage="zh">
          <ThemeProvider>
            <Sidebar />
            <main className="flex-1 min-h-screen pl-[var(--sidebar-width,16rem)] flex flex-col relative z-10 transition-[padding] duration-200">
              {children}
            </main>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
