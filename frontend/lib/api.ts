/**
 * Backend API client. One place that knows the backend URL so every screen
 * stays consistent as we add endpoints (analyze, match, concierge) in later phases.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Health = {
  status: string;
  service: string;
  model: string;
  anthropic_configured: boolean;
};

export async function getHealth(signal?: AbortSignal): Promise<Health> {
  const res = await fetch(`${API_URL}/health`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export type Severity = "critical" | "warning" | "info";
export type Discrepancy = { severity: Severity; title: string; detail: string };

export type WatchCategory =
  | "immediate_risk"
  | "upcoming_milestone"
  | "dependency"
  | "uncertainty"
  | "long_term";

export type WatchItem = {
  category: WatchCategory;
  what: string;
  why: string;
  impact: string;
  timing?: string;
};

export type Urgency = "action_needed" | "time_sensitive" | "on_track";
export type KeyFact = { label: string; value: string };
export type Headline = {
  verdict: string;
  urgency: Urgency;
  key_facts: KeyFact[];
};

/** The structured assessment delivered at the end of an analyze stream. */
export type Assessment = {
  headline?: Headline;
  situation: string;
  where_you_stand: string;
  next_step: string;
  what_to_watch: WatchItem[];
  discrepancies?: Discrepancy[];
};

export type Source = { url: string; title: string };
export type SourcesData = { sources: Source[]; queries: string[] };

export type Attorney = {
  id: string;
  name: string;
  firm: string;
  location: string;
  focus: string;
  specialties: string[];
  experience_years: number;
  languages: string[];
  blurb: string;
  reason: string;
};

/** POST /match — rank the best-fit attorneys for a completed assessment. */
export async function getMatches(
  assessment: Assessment,
  signal?: AbortSignal,
): Promise<Attorney[]> {
  const res = await fetch(`${API_URL}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assessment),
    signal,
  });
  if (!res.ok) throw new Error(`Match failed: ${res.status}`);
  const data = await res.json();
  return data.matches ?? [];
}

// ---- What Next action plan ----
export type PlanAction = { action: string; why: string };
export type PlanPath = {
  path: string;
  when_available?: string;
  eligibility?: string;
  why_choose: string;
  limitations?: string;
};
export type PlanDoc = { document: string; why: string; when_needed?: string };
export type PlanConsideration = { consideration: string; detail: string };
export type PlanScenario = {
  scenario: string;
  what_changes?: string;
  strategy_change: string;
  new_risks?: string;
};
export type PlanSuggestion = { suggestion: string; why: string };

export type PlanData = {
  immediate_actions: PlanAction[];
  available_paths: PlanPath[];
  things_to_verify: string[];
  documents_to_organize: PlanDoc[];
  hidden_considerations: PlanConsideration[];
  scenario_exploration: PlanScenario[];
  strategic_suggestions: PlanSuggestion[];
  recommended_next_steps: string[];
};

export type PlanHandlers = {
  onPlan: (data: PlanData) => void;
  onStatus?: (text: string) => void;
  onSources?: (data: SourcesData) => void;
  onError: (message: string) => void;
};

/** POST /plan — stream the deep What-Next action plan. */
export async function streamPlan(
  situation: string,
  assessment: Assessment,
  handlers: PlanHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ situation, assessment }),
    signal,
  });
  if (!res.ok || !res.body) {
    handlers.onError(`Request failed (${res.status}).`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg: { type: string; text?: string; data?: PlanData | SourcesData; message?: string };
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.type === "plan" && msg.data) handlers.onPlan(msg.data as PlanData);
      else if (msg.type === "sources" && msg.data)
        handlers.onSources?.(msg.data as SourcesData);
      else if (msg.type === "status" && msg.text) handlers.onStatus?.(msg.text);
      else if (msg.type === "error" && msg.message) handlers.onError(msg.message);
    }
  }
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Optional case context so the concierge can tailor document/prep advice. */
export type CaseContext = { situation: string; assessment: Assessment };

/** POST /concierge/chat — stream the concierge reply token by token. */
export async function streamConcierge(
  attorneyId: string,
  messages: ChatMessage[],
  handlers: { onToken: (t: string) => void; onError: (m: string) => void },
  caseContext?: CaseContext,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/concierge/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attorney_id: attorneyId,
      messages,
      case_context: caseContext,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError(`Request failed (${res.status}).`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg: { type: string; text?: string; message?: string };
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.type === "token" && msg.text) handlers.onToken(msg.text);
      else if (msg.type === "error" && msg.message) handlers.onError(msg.message);
    }
  }
}

export type AnalyzeHandlers = {
  onReasoning: (text: string) => void;
  onResult: (data: Assessment) => void;
  onError: (message: string) => void;
  onStatus?: (text: string) => void;
  onSources?: (data: SourcesData) => void;
};

/**
 * POST /analyze and read the NDJSON stream, dispatching each event to a handler.
 * Resolves when the stream is fully consumed (the backend ends with `done`).
 */
export async function streamAnalyze(
  situation: string,
  files: File[],
  handlers: AnalyzeHandlers,
  signal?: AbortSignal,
): Promise<void> {
  // multipart so optional document uploads ride along with the text.
  const form = new FormData();
  form.append("situation", situation);
  for (const file of files) form.append("files", file);

  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    body: form, // browser sets multipart Content-Type + boundary
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError(`Request failed (${res.status}). Is the backend running?`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // NDJSON: parse complete lines as they arrive.
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      let msg: {
        type: string;
        text?: string;
        data?: Assessment | SourcesData;
        message?: string;
      };
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // ignore a partial/garbled line
      }

      if (msg.type === "reasoning" && msg.text) handlers.onReasoning(msg.text);
      else if (msg.type === "result" && msg.data)
        handlers.onResult(msg.data as Assessment);
      else if (msg.type === "sources" && msg.data)
        handlers.onSources?.(msg.data as SourcesData);
      else if (msg.type === "status" && msg.text)
        handlers.onStatus?.(msg.text);
      else if (msg.type === "error" && msg.message) handlers.onError(msg.message);
      // "done" needs no handler — loop ends when the body closes.
    }
  }
}
