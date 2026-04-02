import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "干扰管理平台",
    template: "%s | 干扰管理平台",
  },
  description: "基于 Django + Next.js 的企业干扰管理系统前端。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
