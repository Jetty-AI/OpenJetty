import type { Attorney } from "@/lib/api";

// Deterministic avatar color from the attorney id.
const AVATAR_COLORS = [
  "linear-gradient(135deg,#2563eb,#1d4ed8)",
  "linear-gradient(135deg,#0891b2,#06b6d4)",
  "linear-gradient(135deg,#7c3aed,#6d28d9)",
  "linear-gradient(135deg,#db2777,#be185d)",
  "linear-gradient(135deg,#ea580c,#c2410c)",
  "linear-gradient(135deg,#059669,#047857)",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function colorFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function AttorneyCard({
  attorney,
  rank,
  onAskConcierge,
}: {
  attorney: Attorney;
  rank: number;
  onAskConcierge: (a: Attorney) => void;
}) {
  return (
    <div
      className="oj-card oj-rise p-5"
      style={{ animationDelay: `${rank * 90}ms` }}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
          style={{ background: colorFor(attorney.id) }}
        >
          {initials(attorney.name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {attorney.name}
            </h3>
            <span className="shrink-0 text-xs text-muted">
              {attorney.experience_years} yrs
            </span>
          </div>
          <p className="text-sm text-muted">
            {attorney.firm} · {attorney.location}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {attorney.specialties.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Why this match */}
      <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Why this match
        </p>
        <p className="mt-1 text-sm leading-7 text-foreground">
          {attorney.reason}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onAskConcierge(attorney)}
        className="oj-btn oj-btn-ghost mt-4 w-full"
      >
        Ask {attorney.name.split(" ")[0]}&apos;s AI concierge
      </button>
    </div>
  );
}
