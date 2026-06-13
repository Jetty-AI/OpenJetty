"use client";

import { useEffect, useRef, useState } from "react";
import {
  streamConcierge,
  type Attorney,
  type ChatMessage,
  type CaseContext,
} from "@/lib/api";
import { CloseIcon, ArrowRightIcon } from "./icons";
import Markdown from "./Markdown";

const STARTERS = [
  "Do you offer free consultations?",
  "What documents should I bring?",
  "What are your fees?",
  "What happens after I hire you?",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ConciergeChat({
  attorney,
  caseContext,
  onClose,
}: {
  attorney: Attorney;
  caseContext?: CaseContext;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // Close on Escape; abort any in-flight stream on unmount.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      abortRef.current?.abort();
    };
  }, [onClose]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamConcierge(
        attorney.id,
        history,
        {
          onToken: (t) =>
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = {
                role: "assistant",
                content: last.content + t,
              };
              return copy;
            }),
          onError: (msg) =>
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = {
                role: "assistant",
                content: `⚠️ ${msg}`,
              };
              return copy;
            }),
        },
        caseContext,
        ctrl.signal,
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* drawer */}
      <div className="oj-drawer relative flex h-full w-full max-w-md flex-col bg-surface shadow-2xl">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-strong text-sm font-bold text-white">
            {initials(attorney.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {attorney.name} · AI concierge
            </h2>
            <p className="truncate text-xs text-muted">
              Answers from {attorney.firm}&apos;s intake materials
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted transition hover:bg-background hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* greeting */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-background px-4 py-2.5 text-sm leading-7 text-foreground">
              Hi! I&apos;m the AI concierge for {attorney.name}&apos;s office. Ask
              me about consultations, fees, or what to expect — I&apos;ll answer
              from our intake materials.
            </div>
          </div>

          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const isLast = i === messages.length - 1;
            return (
              <div
                key={i}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-sm ${
                    isUser
                      ? "whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-brand leading-7 text-white"
                      : "rounded-2xl rounded-tl-sm bg-background text-foreground"
                  }`}
                >
                  {isUser ? m.content : <Markdown>{m.content}</Markdown>}
                  {!isUser && isLast && streaming && <span className="oj-caret" />}
                </div>
              </div>
            );
          })}

          {/* starter chips (only before any conversation) */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {STARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand-soft"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask about consultations, fees, documents…"
              className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-6 text-foreground placeholder:text-muted/70 focus:border-brand focus:outline-none"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              aria-label="Send"
              className="oj-btn oj-btn-primary !px-3 !py-2.5"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[0.7rem] text-muted">
            Demo concierge · answers only from this firm&apos;s intake documents.
          </p>
        </div>
      </div>
    </div>
  );
}
