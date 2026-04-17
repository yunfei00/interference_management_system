import type { AbstractIntlMessages } from "next-intl";

import type { AppLocale } from "./config";

const messageLoaders: Record<AppLocale, () => Promise<AbstractIntlMessages>> = {
  "zh-CN": async () => (await import("./messages/zh-CN.json")).default,
  en: async () => (await import("./messages/en.json")).default,
};

export async function loadMessages(locale: AppLocale): Promise<AbstractIntlMessages> {
  return messageLoaders[locale]();
}
