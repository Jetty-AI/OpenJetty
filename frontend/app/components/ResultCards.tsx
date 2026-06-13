import type { WatchCategory, WatchItem } from "@/lib/api";
import { UserIcon, CompassIcon, ArrowRightIcon, EyeIcon } from "./icons";

// ---- Prominent "next step" — the decision the page is built around. ----
export function NextStepCard({ text }: { text: string }) {
  return (
    <div className="oj-card oj-rise relative overflow-hidden p-5">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: "var(--success)" }}
      />
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "rgba(22,163,74,0.12)", color: "var(--success)" }}
        >
          <ArrowRightIcon className="h-4.5 w-4.5" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Your next step
        </h3>
      </div>
      <p className="mt-3 text-[1.02rem] font-medium leading-7 text-foreground">
        {text}
      </p>
    </div>
  );
}

// ---- Background context: situation + where you stand (supporting). ----
export function BackgroundCards({
  situation,
  whereYouStand,
}: {
  situation: string;
  whereYouStand: string;
}) {
  const cards = [
    {
      label: "Your situation",
      text: situation,
      Icon: UserIcon,
      tint: "rgba(37,99,235,0.10)",
      ink: "var(--brand)",
      accent: "var(--brand)",
    },
    {
      label: "Where you stand",
      text: whereYouStand,
      Icon: CompassIcon,
      tint: "rgba(6,182,212,0.12)",
      ink: "#0891b2",
      accent: "#06b6d4",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map(({ label, text, Icon, tint, ink, accent }) => (
        <div key={label} className="oj-card relative h-full overflow-hidden p-5">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1"
            style={{ background: accent }}
          />
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: tint, color: ink }}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {label}
            </h3>
          </div>
          <p className="mt-3 text-[0.95rem] leading-7 text-foreground">{text}</p>
        </div>
      ))}
    </div>
  );
}

// ---- Ranked, categorized watch list. ----
const WATCH_META: Record<
  WatchCategory,
  { label: string; bg: string; ink: string; order: number }
> = {
  immediate_risk: { label: "Risk", bg: "rgba(220,38,38,0.10)", ink: "var(--danger)", order: 0 },
  upcoming_milestone: { label: "Milestone", bg: "rgba(37,99,235,0.10)", ink: "var(--brand)", order: 1 },
  dependency: { label: "Depends on", bg: "rgba(124,58,237,0.12)", ink: "#7c3aed", order: 2 },
  uncertainty: { label: "Verify", bg: "rgba(217,119,6,0.12)", ink: "var(--warning)", order: 3 },
  long_term: { label: "Long-term", bg: "rgba(100,116,139,0.14)", ink: "var(--muted)", order: 4 },
};

export function WatchList({ items }: { items: WatchItem[] }) {
  const sorted = [...items].sort(
    (a, b) =>
      (WATCH_META[a.category]?.order ?? 9) - (WATCH_META[b.category]?.order ?? 9),
  );
  if (!sorted.length) return null;

  return (
    <div className="oj-card oj-rise relative overflow-hidden p-5">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: "var(--warning)" }}
      />
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "rgba(217,119,6,0.12)", color: "var(--warning)" }}
        >
          <EyeIcon className="h-4.5 w-4.5" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          What to watch
        </h3>
      </div>

      <ul className="mt-4 space-y-3">
        {sorted.map((item, i) => {
          const meta = WATCH_META[item.category] ?? WATCH_META.long_term;
          return (
            <li
              key={i}
              className="flex flex-col gap-1 border-t border-border pt-3 first:border-0 first:pt-0 sm:flex-row sm:gap-3"
            >
              <span
                className="h-fit shrink-0 rounded-md px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide"
                style={{ background: meta.bg, color: meta.ink }}
              >
                {meta.label}
              </span>
              <div className="min-w-0">
                <p className="text-[0.95rem] font-semibold text-foreground">
                  {item.what}
                  {item.timing ? (
                    <span className="ml-2 align-middle text-xs font-normal text-muted">
                      · {item.timing}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm leading-7 text-muted">
                  {item.why}
                  {item.impact ? (
                    <> <span className="text-foreground">{item.impact}</span></>
                  ) : null}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
