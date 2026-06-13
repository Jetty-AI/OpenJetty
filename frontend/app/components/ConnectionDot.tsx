"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";

/** Compact backend status indicator for the header. */
export default function ConnectionDot() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getHealth(ctrl.signal)
      .then(() => setOk(true))
      .catch((err) => {
        if (err.name !== "AbortError") setOk(false);
      });
    return () => ctrl.abort();
  }, []);

  const color =
    ok === null ? "bg-muted" : ok ? "bg-success" : "bg-danger";
  const label =
    ok === null ? "Connecting…" : ok ? "Connected" : "Offline";

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
      <span className="relative flex h-2 w-2">
        {ok && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </span>
      {label}
    </span>
  );
}
