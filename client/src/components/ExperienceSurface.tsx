import type { ReactNode } from "react";

export function CustomerExperienceSurface({ page, children }: { page: "business" | "queue" | "account"; children: ReactNode }) {
  return <div className={`customer-event-surface customer-event-${page}`}>{children}</div>;
}
