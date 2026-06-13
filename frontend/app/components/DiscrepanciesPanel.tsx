import type { Discrepancy, Severity } from "@/lib/api";
import { AlertIcon } from "./icons";

const STYLES: Record<
  Severity,
  { label: string; bar: string; chipBg: string; chipInk: string }
> = {
  critical: {
    label: "Critical",
    bar: "var(--danger)",
    chipBg: "rgba(220,38,38,0.10)",
    chipInk: "var(--danger)",
  },
  warning: {
    label: "Warning",
    bar: "var(--warning)",
    chipBg: "rgba(217,119,6,0.12)",
    chipInk: "var(--warning)",
  },
  info: {
    label: "Note",
    bar: "var(--brand)",
    chipBg: "var(--brand-soft)",
    chipInk: "var(--brand)",
  },
};

const ORDER: Severity[] = ["critical", "warning", "info"];

export default function DiscrepanciesPanel({
  items,
}: {
  items: Discrepancy[];
}) {
  if (!items.length) return null;

  const sorted = [...items].sort(
    (a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity),
  );
  const criticalCount = items.filter((d) => d.severity === "critical").length;

  return (
    <div className="oj-rise">
      <div className="mb-3 flex items-center gap-2 px-1">
        <AlertIcon className="h-4.5 w-4.5 text-warning" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Document check
        </h2>
        <span className="text-xs text-muted">
          {items.length} finding{items.length > 1 ? "s" : ""}
          {criticalCount > 0 && (
            <span className="text-danger"> · {criticalCount} critical</span>
          )}
        </span>
      </div>

      <div className="space-y-3">
        {sorted.map((d, i) => {
          const s = STYLES[d.severity];
          return (
            <div
              key={i}
              className="oj-card relative overflow-hidden p-4 pl-5"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ background: s.bar }}
              />
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide"
                  style={{ background: s.chipBg, color: s.chipInk }}
                >
                  {s.label}
                </span>
                <div>
                  <h3 className="text-[0.95rem] font-semibold text-foreground">
                    {d.title}
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-muted">{d.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
