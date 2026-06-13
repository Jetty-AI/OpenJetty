"use client";

import { useEffect, useState } from "react";
import { SpinnerIcon } from "./icons";

/** Loading state for the action plan, with a live elapsed counter so a long
 *  (~1 min) generation reads as working, not frozen. */
export default function PlanLoading() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="oj-card flex items-center gap-3 p-5 text-sm text-muted">
      <SpinnerIcon className="h-4 w-4 animate-spin text-brand" />
      <span>
        Building your action plan…{" "}
        <span className="font-medium text-foreground">{secs}s</span>
        <span className="text-muted"> · this usually takes under a minute</span>
      </span>
    </div>
  );
}
