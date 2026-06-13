"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Constrained component set sized for a chat bubble. react-markdown does NOT
// render raw HTML by default, so this is safe from injection. Headings are
// downgraded to bold lines so a reply can't blow out the bubble.
const COMPONENTS: Components = {
  p: (props) => <p className="mb-2 leading-7 last:mb-0">{props.children}</p>,
  ul: (props) => (
    <ul className="my-2 list-disc space-y-1 pl-5 last:mb-0">{props.children}</ul>
  ),
  ol: (props) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 last:mb-0">{props.children}</ol>
  ),
  li: (props) => <li className="leading-7">{props.children}</li>,
  strong: (props) => (
    <strong className="font-semibold text-foreground">{props.children}</strong>
  ),
  em: (props) => <em className="italic">{props.children}</em>,
  a: (props) => (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand underline underline-offset-2"
    >
      {props.children}
    </a>
  ),
  h1: (props) => (
    <p className="mb-1 mt-2 font-semibold text-foreground first:mt-0">
      {props.children}
    </p>
  ),
  h2: (props) => (
    <p className="mb-1 mt-2 font-semibold text-foreground first:mt-0">
      {props.children}
    </p>
  ),
  h3: (props) => (
    <p className="mb-1 mt-2 font-semibold text-foreground first:mt-0">
      {props.children}
    </p>
  ),
  code: (props) => (
    <code className="rounded bg-surface px-1 py-0.5 font-mono text-[0.85em]">
      {props.children}
    </code>
  ),
  hr: () => <hr className="my-2 border-border" />,
  blockquote: (props) => (
    <blockquote className="border-l-2 border-border pl-3 text-muted">
      {props.children}
    </blockquote>
  ),
};

export default function Markdown({ children }: { children: string }) {
  if (typeof children !== "string") return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {children}
    </ReactMarkdown>
  );
}
