import type { Headline, Urgency } from "@/lib/api";
import { AlertIcon, BoltIcon, CheckIcon } from "./icons";

const URGENCY: Record<
  Urgency,
  { label: string; Icon: (p: { className?: string }) => React.ReactElement; ink: string; bg: string; ring: string }
> = {
  action_needed: {
    label: "Action needed",
    Icon: AlertIcon,
    ink: "var(--danger)",
    bg: "rgba(220,38,38,0.08)",
    ring: "rgba(220,38,38,0.35)",
  },
  time_sensitive: {
    label: "Time-sensitive",
    Icon: BoltIcon,
    ink: "var(--warning)",
    bg: "rgba(217,119,6,0.08)",
    ring: "rgba(217,119,6,0.35)",
  },
  on_track: {
    label: "On track",
    Icon: CheckIcon,
    ink: "var(--success)",
    bg: "rgba(22,163,74,0.08)",
    ring: "rgba(22,163,74,0.30)",
  },
};

export default function HeadlineBanner({ headline }: { headline: Headline }) {
  const u = URGENCY[headline.urgency] ?? URGENCY.on_track;
  const { Icon } = u;

  return (
    <div
      className="oj-card oj-rise overflow-hidden p-5 sm:p-6"
      style={{ background: u.bg, borderColor: u.ring }}
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
        style={{ background: "var(--surface)", color: u.ink }}
      >
        <Icon className="h-3.5 w-3.5" />
        {u.label}
      </span>

      <p className="mt-3 text-balance text-xl font-semibold leading-8 text-foreground sm:text-2xl">
        {headline.verdict}
      </p>

      {headline.key_facts?.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {headline.key_facts.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface px-3 py-2.5"
            >
              <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">
                {f.label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold leading-6 text-foreground">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
