import type { SourcesData } from "@/lib/api";
import { GlobeIcon } from "./icons";

/** Pretty domain from a URL, e.g. "travel.state.gov". */
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function SourcesPanel({
  data,
  embedded = false,
}: {
  data: SourcesData;
  embedded?: boolean;
}) {
  const { sources, queries } = data;
  if (!sources.length && !queries.length) return null;

  return (
    <div className={embedded ? "" : "oj-card oj-rise p-5"}>
      {!embedded && (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <GlobeIcon className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Live sources
            </h3>
            <p className="text-xs text-muted">
              Fetched in real time to ground this answer
            </p>
          </div>
        </div>
      )}

      {queries.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {queries.map((q, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted"
            >
              <span className="text-brand">⌕</span>
              {q}
            </span>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-brand-soft"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground group-hover:text-brand-strong">
                    {s.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {domainOf(s.url)}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
