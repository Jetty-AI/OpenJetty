"use client";

import { useState } from "react";
import { ChevronIcon } from "./icons";

/** A lightweight progressive-disclosure section: a header row that toggles its body. */
export default function Collapsible({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="oj-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="flex flex-col">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            {title}
          </span>
          {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
        </span>
        <ChevronIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">{children}</div>
      )}
    </div>
  );
}
