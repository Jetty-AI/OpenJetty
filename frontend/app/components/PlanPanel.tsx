"use client";

import { useState } from "react";
import type { PlanData } from "@/lib/api";
import {
  BoltIcon,
  RouteIcon,
  CheckIcon,
  BranchIcon,
  FileIcon,
  EyeIcon,
  SparkIcon,
  ChevronIcon,
} from "./icons";

type IconC = (p: { className?: string }) => React.ReactElement;

function Section({
  title,
  Icon,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  Icon: IconC;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  if (!count) return null;
  return (
    <div className="border-t border-border first:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 py-3.5 text-left"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="flex-1 text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted">{count}</span>
        <ChevronIcon
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export default function PlanPanel({ plan }: { plan: PlanData }) {
  return (
    <div className="oj-card oj-rise overflow-hidden px-5">
      <div className="flex items-center gap-2.5 border-b border-border py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-white">
          <RouteIcon className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Your action plan
          </h2>
          <p className="text-xs text-muted">
            A strategist&apos;s view of what to do next
          </p>
        </div>
      </div>

      {/* Immediate actions */}
      <Section
        title="Immediate actions (next 24–72h)"
        Icon={BoltIcon}
        count={plan.immediate_actions?.length ?? 0}
        defaultOpen
      >
        <ol className="space-y-3">
          {plan.immediate_actions.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[0.7rem] font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-[0.95rem] font-semibold text-foreground">
                  {a.action}
                </p>
                <p className="mt-0.5 text-sm leading-7 text-muted">{a.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Available paths */}
      <Section
        title="Available paths"
        Icon={RouteIcon}
        count={plan.available_paths?.length ?? 0}
        defaultOpen
      >
        <div className="space-y-3">
          {plan.available_paths.map((p, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-4">
              <p className="text-[0.95rem] font-semibold text-foreground">
                {p.path}
              </p>
              <p className="mt-1 text-sm leading-7 text-muted">{p.why_choose}</p>
              <dl className="mt-2 space-y-1 text-sm">
                {p.when_available && (
                  <Meta label="When" value={p.when_available} />
                )}
                {p.eligibility && (
                  <Meta label="Eligibility" value={p.eligibility} />
                )}
                {p.limitations && (
                  <Meta label="Trade-offs" value={p.limitations} ink="var(--warning)" />
                )}
              </dl>
            </div>
          ))}
        </div>
      </Section>

      {/* Scenario exploration */}
      <Section
        title="What-if scenarios"
        Icon={BranchIcon}
        count={plan.scenario_exploration?.length ?? 0}
      >
        <div className="space-y-3">
          {plan.scenario_exploration.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-4">
              <p className="text-[0.95rem] font-semibold text-foreground">
                {s.scenario}
              </p>
              {s.what_changes && (
                <p className="mt-1 text-sm leading-7 text-muted">
                  {s.what_changes}
                </p>
              )}
              <p className="mt-1.5 text-sm leading-7">
                <span className="font-medium text-brand">Strategy: </span>
                <span className="text-foreground">{s.strategy_change}</span>
              </p>
              {s.new_risks && (
                <p className="mt-1 text-sm leading-7 text-muted">{s.new_risks}</p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Strategic suggestions */}
      <Section
        title="Strategic suggestions"
        Icon={SparkIcon}
        count={plan.strategic_suggestions?.length ?? 0}
      >
        <ul className="space-y-3">
          {plan.strategic_suggestions.map((s, i) => (
            <li key={i}>
              <p className="text-[0.95rem] font-semibold text-foreground">
                {s.suggestion}
              </p>
              <p className="mt-0.5 text-sm leading-7 text-muted">{s.why}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Hidden considerations */}
      <Section
        title="Hidden considerations"
        Icon={EyeIcon}
        count={plan.hidden_considerations?.length ?? 0}
      >
        <ul className="space-y-3">
          {plan.hidden_considerations.map((c, i) => (
            <li key={i}>
              <p className="text-[0.95rem] font-semibold text-foreground">
                {c.consideration}
              </p>
              <p className="mt-0.5 text-sm leading-7 text-muted">{c.detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Things to verify */}
      <Section
        title="Things to verify"
        Icon={CheckIcon}
        count={plan.things_to_verify?.length ?? 0}
      >
        <ul className="space-y-2">
          {plan.things_to_verify.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-7">
              <CheckIcon className="mt-1.5 h-3.5 w-3.5 shrink-0 text-brand" />
              <span className="text-foreground">{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Documents to organize */}
      <Section
        title="Documents to organize"
        Icon={FileIcon}
        count={plan.documents_to_organize?.length ?? 0}
      >
        <ul className="space-y-3">
          {plan.documents_to_organize.map((d, i) => (
            <li key={i}>
              <p className="text-[0.95rem] font-semibold text-foreground">
                {d.document}
                {d.when_needed ? (
                  <span className="ml-2 text-xs font-normal text-muted">
                    · {d.when_needed}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-sm leading-7 text-muted">{d.why}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Recommended next steps */}
      <Section
        title="Recommended next steps"
        Icon={CheckIcon}
        count={plan.recommended_next_steps?.length ?? 0}
        defaultOpen
      >
        <ol className="space-y-2">
          {plan.recommended_next_steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm leading-7">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-[0.7rem] font-bold text-success">
                {i + 1}
              </span>
              <span className="text-foreground">{s}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function Meta({
  label,
  value,
  ink,
}: {
  label: string;
  value: string;
  ink?: string;
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-medium text-muted">{label}:</dt>
      <dd style={ink ? { color: ink } : undefined} className="text-foreground">
        {value}
      </dd>
    </div>
  );
}
