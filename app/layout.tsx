import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AiSettingsHydrator } from "@/components/ai/AiSettingsHydrator";

export const metadata: Metadata = {
  title: "MermaidApp",
  description: "AI-powered Mermaid diagram editor with real-time rendering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen">
        <AiSettingsHydrator />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
