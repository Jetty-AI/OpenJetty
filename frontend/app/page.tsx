"use client";

import { useEffect, useRef, useState } from "react";
import {
  streamAnalyze,
  getMatches,
  streamPlan,
  type Assessment,
  type SourcesData,
  type Attorney,
  type PlanData,
} from "@/lib/api";
import ConnectionDot from "./components/ConnectionDot";
import HeadlineBanner from "./components/HeadlineBanner";
import Collapsible from "./components/Collapsible";
import { NextStepCard, WatchList } from "./components/ResultCards";
import SourcesPanel from "./components/SourcesPanel";
import DiscrepanciesPanel from "./components/DiscrepanciesPanel";
import AttorneyCard from "./components/AttorneyCard";
import ConciergeChat from "./components/ConciergeChat";
import PlanPanel from "./components/PlanPanel";
import PlanLoading from "./components/PlanLoading";
import {
  SparkIcon,
  SpinnerIcon,
  UploadIcon,
  FileIcon,
  CloseIcon,
} from "./components/icons";

const DEMO_SCENARIO =
  "I came to the US on an F-1 student visa in 2015. I graduated in 2018 and got OPT. My employer sponsored my H-1B in 2019 and I have been on H-1B since October 2019. My employer filed my I-140 in January 2022 under EB-2. My country of birth is India. My priority date is January 15, 2022. I want to know where I stand on my green card and what I should be doing.";

const DOC_DEMO_TEXT =
  "I changed jobs in August 2023. My new employer is Startup Inc. Is my green card still valid?";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

type Status = "idle" | "streaming" | "done" | "error";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [situation, setSituation] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [reasoning, setReasoning] = useState("");
  const [result, setResult] = useState<Assessment | null>(null);
  const [sources, setSources] = useState<SourcesData | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(true);
  const [matches, setMatches] = useState<Attorney[] | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [concierge, setConcierge] = useState<Attorney | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planStatus, setPlanStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );

  const reasoningRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (status === "streaming" && reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [reasoning, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = status === "streaming";

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        const okType =
          f.type === "application/pdf" || f.type.startsWith("image/");
        if (!okType || f.size > MAX_BYTES) continue;
        if (merged.some((x) => x.name === f.name && x.size === f.size)) continue;
        merged.push(f);
      }
      return merged.slice(0, MAX_FILES);
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function loadDocDemo() {
    if (busy) return;
    setSituation(DOC_DEMO_TEXT);
    try {
      const res = await fetch("/sample-i140-approval.pdf");
      const blob = await res.blob();
      setFiles([
        new File([blob], "sample-i140-approval.pdf", {
          type: "application/pdf",
        }),
      ]);
    } catch {
      /* sample asset missing — text demo still works */
    }
  }

  async function handleAnalyze() {
    const text = situation.trim();
    if (!text || busy) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus("streaming");
    setReasoning("");
    setResult(null);
    setSources(null);
    setStatusText(
      files.length ? "Reading your documents…" : "Reading your situation…",
    );
    setError(null);
    setShowReasoning(true);
    setMatches(null);
    setMatchLoading(false);
    setPlan(null);
    setPlanStatus("idle");

    try {
      await streamAnalyze(
        text,
        files,
        {
          onReasoning: (t) => setReasoning((prev) => prev + t),
          onStatus: (t) => setStatusText(t),
          onSources: (data) => setSources(data),
          onResult: (data) => {
            setResult(data);
            setShowReasoning(false);
            setStatusText(null);
            // Match specialists once the assessment is in hand.
            setMatchLoading(true);
            getMatches(data, ctrl.signal)
              .then((m) => setMatches(m))
              .catch((e) => {
                if ((e as Error).name !== "AbortError") setMatches([]);
              })
              .finally(() => setMatchLoading(false));
            // Build the deep action plan in parallel (lazy / separate call).
            setPlanStatus("loading");
            streamPlan(
              text,
              data,
              {
                onPlan: (p) => {
                  setPlan(p);
                  setPlanStatus("idle");
                },
                onError: (m) => {
                  if (m) setPlanStatus("error");
                },
              },
              ctrl.signal,
            ).catch(() => setPlanStatus("error"));
          },
          onError: (message) => {
            setError(message);
            setStatus("error");
          },
        },
        ctrl.signal,
      );
      setStatus((s) => (s === "error" ? s : "done"));
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(String((err as Error).message ?? err));
        setStatus("error");
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAnalyze();
    }
  }

  const showWorkspace = status !== "idle";
  const discrepancies = result?.discrepancies ?? [];

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand to-brand-strong text-white">
              <SparkIcon className="h-3.5 w-3.5" />
            </span>
            Open<span className="-ml-1.5 text-brand">Jetty</span>
          </div>
          <ConnectionDot />
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-3xl flex-1 px-6 pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, rgba(37,99,235,0.10) 0%, rgba(6,182,212,0.05) 40%, transparent 75%)",
          }}
        />

        {/* Hero */}
        <section className="pt-14 text-center sm:pt-20">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Want to use Fable by Anthropic?{" "}
            <span className="font-semibold text-brand">Get OpenJetty</span>
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Get clarity on your immigration — in minutes
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-lg leading-8 text-muted">
            Describe your immigration situation in plain English. OpenJetty
            reasons through it and tells you exactly where you stand — and what
            to do next.
          </p>
        </section>

        {/* Input card */}
        <section className="mt-9">
          <div
            className={`oj-card p-2 shadow-[var(--shadow-md)] transition ${
              dragActive ? "ring-2 ring-brand ring-offset-2" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. I'm on an H-1B visa. My employer filed my green card. My priority date is March 2019, EB-2 India. Where do I stand and what should I be doing?"
              rows={5}
              className="w-full resize-y rounded-xl bg-transparent px-4 py-3 text-[0.97rem] leading-7 text-foreground placeholder:text-muted/70 focus:outline-none"
            />

            {/* File chips */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pb-1">
                {files.map((f, i) => (
                  <span
                    key={`${f.name}-${f.size}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background py-1 pl-2 pr-1 text-xs"
                  >
                    <FileIcon className="h-3.5 w-3.5 text-brand" />
                    <span className="max-w-[180px] truncate font-medium text-foreground">
                      {f.name}
                    </span>
                    <span className="text-muted">{formatBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={busy}
                      aria-label={`Remove ${f.name}`}
                      className="rounded p-0.5 text-muted transition hover:bg-border hover:text-foreground disabled:opacity-50"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1.5 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-brand disabled:opacity-50"
              >
                <UploadIcon className="h-4 w-4" />
                Attach documents
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={busy || !situation.trim()}
                className="oj-btn oj-btn-primary"
              >
                {busy ? (
                  <>
                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <SparkIcon className="h-4 w-4" />
                    Analyze my situation
                  </>
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs text-muted">
              Optional: upload an I-140, I-94, or approval notice (PDF/image) for
              a deeper, cross-checked analysis.
            </p>
            <div className="flex items-center gap-3 text-sm font-medium">
              <button
                type="button"
                onClick={() => {
                  setSituation(DEMO_SCENARIO);
                  setFiles([]);
                }}
                disabled={busy}
                className="text-brand transition hover:text-brand-strong disabled:opacity-50"
              >
                Demo
              </button>
              <span className="text-border">·</span>
              <button
                type="button"
                onClick={loadDocDemo}
                disabled={busy}
                className="text-brand transition hover:text-brand-strong disabled:opacity-50"
              >
                Document demo
              </button>
            </div>
          </div>
          <p className="mt-1 px-1 text-xs text-muted">
            Press ⌘/Ctrl + Enter to analyze. OpenJetty provides information, not
            legal advice.
          </p>
        </section>

        {/* Workspace */}
        {showWorkspace && (
          <section className="mt-10 space-y-5">
            {/* Live reasoning — prominent only while we generate the headline */}
            {!result && status !== "error" && (
              <div className="oj-card overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 text-sm font-semibold">
                  <SpinnerIcon className="h-4 w-4 animate-spin text-brand" />
                  {statusText ?? "Reasoning through your case…"}
                </div>
                {reasoning && (
                  <div
                    ref={reasoningRef}
                    className="max-h-72 overflow-y-auto border-t border-border px-5 py-4"
                  >
                    <p className="whitespace-pre-wrap text-[0.92rem] leading-7 text-muted">
                      {reasoning}
                      <span className="oj-caret" />
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="oj-card border-danger/30 bg-danger/5 p-5 text-sm text-danger">
                {error ?? "Something went wrong. Please try again."}
              </div>
            )}

            {result && (
              <>
                {/* GLANCE — verdict, urgency, key facts */}
                {result.headline && <HeadlineBanner headline={result.headline} />}

                {/* CRITICAL — document cross-check */}
                {discrepancies.length > 0 && (
                  <DiscrepanciesPanel items={discrepancies} />
                )}

                {/* DECISION — the next step, dominant */}
                <NextStepCard text={result.next_step} />

                {/* ATTENTION — what to watch */}
                <WatchList items={result.what_to_watch} />

                {/* DEEPER — action plan */}
                {(planStatus === "loading" || plan) && (
                  <div>
                    <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
                      What next
                      {planStatus === "loading" && (
                        <SpinnerIcon className="h-3.5 w-3.5 animate-spin text-brand" />
                      )}
                    </h2>
                    {plan ? <PlanPanel plan={plan} /> : <PlanLoading />}
                  </div>
                )}

                {/* Matched specialists */}
                {(matchLoading || (matches && matches.length > 0)) && (
                  <div>
                    <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
                      Matched specialists
                      {matchLoading && (
                        <SpinnerIcon className="h-3.5 w-3.5 animate-spin text-brand" />
                      )}
                    </h2>
                    {matchLoading ? (
                      <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="oj-card flex items-center gap-4 p-5">
                            <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-border" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3.5 w-1/3 animate-pulse rounded bg-border" />
                              <div className="h-3 w-1/2 animate-pulse rounded bg-border" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matches!.map((a, i) => (
                          <AttorneyCard
                            key={a.id}
                            attorney={a}
                            rank={i}
                            onAskConcierge={setConcierge}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SUPPORTING — progressive disclosure */}
                <div className="space-y-3 pt-2">
                  <Collapsible title="Background & where you stand">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Your situation
                        </p>
                        <p className="mt-1 text-[0.95rem] leading-7 text-foreground">
                          {result.situation}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Where you stand
                        </p>
                        <p className="mt-1 text-[0.95rem] leading-7 text-foreground">
                          {result.where_you_stand}
                        </p>
                      </div>
                    </div>
                  </Collapsible>

                  {sources && (
                    <Collapsible
                      title="Live sources"
                      subtitle={`${sources.sources.length} fetched in real time`}
                    >
                      <SourcesPanel data={sources} embedded />
                    </Collapsible>
                  )}

                  {reasoning && (
                    <Collapsible title="Reasoning">
                      <p className="whitespace-pre-wrap text-[0.92rem] leading-7 text-muted">
                        {reasoning}
                      </p>
                    </Collapsible>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {/* Attorney concierge chat */}
      {concierge && (
        <ConciergeChat
          attorney={concierge}
          caseContext={
            result ? { situation: situation.trim(), assessment: result } : undefined
          }
          onClose={() => setConcierge(null)}
        />
      )}
    </div>
  );
}
