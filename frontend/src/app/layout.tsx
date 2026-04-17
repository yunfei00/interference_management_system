import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";

import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadMessages } from "@/i18n/load-messages";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "干扰管理平台",
    template: "%s | 干扰管理平台",
  },
  description: "企业级干扰管理系统。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
