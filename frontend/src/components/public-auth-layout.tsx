import { APP_NAME } from "@/lib/public-config";

import gateStyles from "./auth-gate.module.css";

function brandInitials() {
  const name = APP_NAME.trim();
  if (!name) {
    return "IM";
  }
  return name.length <= 2 ? name : name.slice(0, 2).toUpperCase();
}

export function PublicAuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className={gateStyles.shell}>
      <main className={gateStyles.page}>
        <aside aria-label="Product identity" className={gateStyles.brand}>
          <div className={gateStyles.brandInner}>
            <div className={gateStyles.brandMark}>{brandInitials()}</div>
            <h1 className={gateStyles.brandTitle}>{APP_NAME}</h1>
            <p className={gateStyles.brandTagline}>{description}</p>
            <p className={gateStyles.brandFoot}>{title}</p>
          </div>
        </aside>
        <div className={gateStyles.panel}>
          <div className={gateStyles.formArea}>{children}</div>
        </div>
      </main>
    </div>
  );
}
