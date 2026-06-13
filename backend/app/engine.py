"""The analyze engine.

Streams Claude's reasoning live, then delivers a schema-valid structured
assessment via a forced-shape tool call. The structured result comes from the
tool's `input` (always valid JSON), so the frontend never has to parse prose.

Phase 1: reasoning + structure. Live USCIS web_search is layered in at Phase 2
without changing this contract.
"""
from __future__ import annotations

import json
from typing import Iterator

from .attorneys import ATTORNEYS, attorney_by_id
from .claude_client import client, MODEL
from .concierge_docs import build_docs_text

# Anthropic server-side web search. Runs during the same streamed response, so
# the model can fetch the current Visa Bulletin / processing times mid-reasoning.
WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5,
}

# The tool whose input schema IS our structured answer. Forcing the model to
# express the final answer as tool input guarantees clean, typed JSON.
ASSESSMENT_TOOL = {
    "name": "deliver_assessment",
    "description": (
        "Deliver the final structured assessment to the user. Call this exactly "
        "once, after you have finished reasoning through the case out loud."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "headline": {
                "type": "object",
                "description": "A glanceable summary for the very top of the page, so the user grasps the essentials in about 5 seconds.",
                "properties": {
                    "verdict": {
                        "type": "string",
                        "description": "ONE plain-language sentence: the bottom-line answer to their question.",
                    },
                    "urgency": {
                        "type": "string",
                        "enum": ["action_needed", "time_sensitive", "on_track"],
                        "description": "action_needed = something to do soon or a critical document issue; time_sensitive = upcoming deadlines/windows to track; on_track = stable, mainly monitoring.",
                    },
                    "key_facts": {
                        "type": "array",
                        "description": "2-4 glanceable facts (short values, a few words each) — e.g. category, priority date, whether they can file now, rough wait.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "value": {"type": "string"},
                            },
                            "required": ["label", "value"],
                        },
                    },
                },
                "required": ["verdict", "urgency", "key_facts"],
            },
            "situation": {
                "type": "string",
                "description": "One short paragraph, plain English, summarizing the user's immigration situation as you understand it.",
            },
            "where_you_stand": {
                "type": "string",
                "description": "A specific statement of their current standing — e.g. whether their priority date is current, whether they can file now or must wait, and roughly how long.",
            },
            "next_step": {
                "type": "string",
                "description": "The single most important concrete action to take next, specific and actionable.",
            },
            "what_to_watch": {
                "type": "array",
                "description": "3-5 things this person should keep an eye on, ranked MOST IMPORTANT FIRST. This list must NEVER be empty — see the WHAT TO WATCH rules in the system prompt.",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": [
                                "immediate_risk",
                                "upcoming_milestone",
                                "dependency",
                                "uncertainty",
                                "long_term",
                            ],
                            "description": "Which kind of watch item this is.",
                        },
                        "what": {
                            "type": "string",
                            "description": "What to watch — a short, concrete headline.",
                        },
                        "why": {
                            "type": "string",
                            "description": "Why it matters for this person.",
                        },
                        "impact": {
                            "type": "string",
                            "description": "The potential impact if it changes or is missed.",
                        },
                        "timing": {
                            "type": "string",
                            "description": "Approximate timing if known (e.g. 'next 30 days', 'by Oct 2025', 'ongoing'). Empty string if not time-bound.",
                        },
                    },
                    "required": ["category", "what", "why", "impact"],
                },
            },
            "discrepancies": {
                "type": "array",
                "description": "Mismatches or risks found by comparing the user's UPLOADED DOCUMENTS against what they described. Leave empty if no documents were provided or nothing noteworthy was found.",
                "items": {
                    "type": "object",
                    "properties": {
                        "severity": {
                            "type": "string",
                            "enum": ["critical", "warning", "info"],
                            "description": "critical = could jeopardize status/eligibility; warning = needs attention; info = worth noting.",
                        },
                        "title": {
                            "type": "string",
                            "description": "Short headline for the finding, e.g. 'Job change may break I-140 portability'.",
                        },
                        "detail": {
                            "type": "string",
                            "description": "Plain-English explanation of the mismatch/risk and why it matters.",
                        },
                    },
                    "required": ["severity", "title", "detail"],
                },
            },
        },
        "required": [
            "headline",
            "situation",
            "where_you_stand",
            "next_step",
            "what_to_watch",
        ],
    },
}

SYSTEM_PROMPT = """You are OpenJetty, an expert U.S. immigration navigator that helps immigrants \
understand where they stand and what to do next.

FIRST, use the `web_search` tool to ground your answer in CURRENT data. Search for:
- the most recent monthly USCIS Visa Bulletin (this month's Final Action Dates and Dates for \
Filing) for the user's category and country of chargeability;
- current USCIS processing times for the relevant form(s) (e.g. I-485, I-140, I-765);
- any recent USCIS policy change relevant to their case.
Prefer official sources (travel.state.gov, uscis.gov). Cite the specific cutoff dates you find.

THEN reason OUT LOUD, step by step, in plain language a non-lawyer can follow. Work through, in \
order:
1. The user's current immigration status and how they got there.
2. Their priority date (if any) versus the CURRENT visa bulletin cutoff you just looked up — are \
they current?
3. Whether they are eligible to file their next form right now, or must keep waiting.
4. A realistic timeline given the current backlog and processing times.
5. The most important thing they should do in the next 30 days.

Be concrete and specific to THIS person — never generic. Reference the actual dates you found. If \
a critical fact is missing, reason about the likely scenarios rather than refusing.

IF THE USER ATTACHED DOCUMENTS (e.g. an I-797 approval notice, I-140, I-94, passport): read them \
carefully and CROSS-REFERENCE them against what the user wrote. Surface any discrepancy or risk the \
user may not be aware of, for example:
- a priority date, classification, or employer in the document that differs from what they said;
- a job change that happened before the I-140 had been approved for 180+ days (AC21 portability \
may not yet apply — a critical risk);
- a travel gap, an OPT end date creating unlawful presence risk, or an expired document.
Put each finding in the `discrepancies` array with an appropriate severity. If there are no \
documents or nothing noteworthy, leave it empty.

HEADLINE — also produce a `headline` for the top of the page: a one-sentence plain-language \
verdict (the bottom line answering their question), an urgency level (action_needed / \
time_sensitive / on_track), and 2-4 key_facts (short label + short value) capturing the \
glanceable essentials — e.g. their category, priority date, whether they can file now, and the \
rough wait. Keep each value to a few words.

WHAT TO WATCH — this section must NEVER be empty. Always return 3-5 items, ranked most \
important first, drawn from these categories in this fallback priority order:
1. immediate_risk — status expiration, filing deadlines, missing documentation, employer \
changes, travel risks.
2. upcoming_milestone — visa bulletin updates, priority-date movement, petition decisions, \
processing-time changes.
3. dependency — employer sponsorship, current employment, family status, future filings.
4. uncertainty — missing approval dates, unknown filing history, unverified status information.
5. long_term — portability eligibility, future visa stamping, green-card strategy, dependent \
impacts.
If there are no immediate risks, do NOT leave the section thin — automatically surface \
milestones, dependencies, uncertainties, and long-term items so the person always knows what \
deserves their attention. For each item, give: what to watch, why it matters, the potential \
impact, and approximate timing if known.

When you have finished reasoning, call the `deliver_assessment` tool exactly once with your \
summary. Do not write the structured summary as prose — put it in the tool call.

You provide information, not legal advice. When stakes are high (status violations, deadlines, \
portability), say so plainly and recommend confirming with a licensed immigration attorney. \
Always include in `what_to_watch` a reminder to verify against the latest Visa Bulletin."""


def _emit(obj: dict) -> str:
    """One NDJSON line."""
    return json.dumps(obj) + "\n"


def _dedupe_sources(items: list[dict], limit: int = 8) -> list[dict]:
    """Keep first occurrence of each URL, in order."""
    seen: set[str] = set()
    out: list[dict] = []
    for it in items:
        url = it.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        out.append(it)
        if len(out) >= limit:
            break
    return out


def _collect_sources(final) -> dict:
    """Pull cited sources + search queries from the final message.

    Prefers the sources the model actually cited; falls back to raw search
    results if it didn't attach citations.
    """
    cited: list[dict] = []
    searched: list[dict] = []
    queries: list[str] = []

    for block in final.content:
        bt = getattr(block, "type", None)
        if bt == "text":
            for c in getattr(block, "citations", None) or []:
                url = getattr(c, "url", None)
                if url:
                    cited.append({"url": url, "title": getattr(c, "title", None) or url})
        elif bt == "web_search_tool_result":
            content = getattr(block, "content", None)
            if isinstance(content, list):
                for r in content:
                    url = getattr(r, "url", None)
                    if url:
                        searched.append(
                            {"url": url, "title": getattr(r, "title", None) or url}
                        )
        elif bt == "server_tool_use" and getattr(block, "name", None) == "web_search":
            q = (getattr(block, "input", None) or {}).get("query")
            if q:
                queries.append(q)

    return {
        "sources": _dedupe_sources(cited) or _dedupe_sources(searched),
        "queries": queries,
    }


IMAGE_MEDIA_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


def _build_user_content(situation: str, documents: list[dict] | None) -> list[dict]:
    """Compose the user message: document/image blocks first, then the text.

    Each document is {"media_type", "data" (base64 str), "name"}.
    """
    content: list[dict] = []
    for doc in documents or []:
        mt = doc.get("media_type", "")
        data = doc.get("data")
        if not data:
            continue
        if mt == "application/pdf":
            content.append(
                {
                    "type": "document",
                    "source": {"type": "base64", "media_type": mt, "data": data},
                    "title": doc.get("name", "document.pdf"),
                }
            )
        elif mt in IMAGE_MEDIA_TYPES:
            content.append(
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": mt, "data": data},
                }
            )

    text = situation
    if content:
        text += (
            "\n\nI've attached my immigration document(s) above. Please read them and "
            "cross-check them against what I described, flagging anything that doesn't "
            "match or any risk I might have missed."
        )
    content.append({"type": "text", "text": text})
    return content


def analyze_stream(
    situation: str, documents: list[dict] | None = None
) -> Iterator[str]:
    """Yield NDJSON lines: search status, reasoning chunks, sources, result."""
    try:
        with client.messages.stream(
            model=MODEL,
            max_tokens=4500,
            system=SYSTEM_PROMPT,
            tools=[WEB_SEARCH_TOOL, ASSESSMENT_TOOL],
            messages=[
                {"role": "user", "content": _build_user_content(situation, documents)}
            ],
        ) as stream:
            for event in stream:
                if event.type == "content_block_start":
                    if getattr(event.content_block, "type", None) == "server_tool_use":
                        yield _emit(
                            {"type": "status", "text": "Searching live USCIS sources…"}
                        )
                elif (
                    event.type == "content_block_delta"
                    and event.delta.type == "text_delta"
                ):
                    yield _emit({"type": "reasoning", "text": event.delta.text})
            final = stream.get_final_message()

        sources = _collect_sources(final)
        if sources["sources"] or sources["queries"]:
            yield _emit({"type": "sources", "data": sources})

        result = None
        for block in final.content:
            if block.type == "tool_use" and block.name == "deliver_assessment":
                result = block.input
                break

        if result:
            yield _emit({"type": "result", "data": result})
        else:
            yield _emit(
                {
                    "type": "error",
                    "message": "The model did not return a structured assessment. Please try again.",
                }
            )
    except Exception as exc:  # surface any API/parsing error to the client
        yield _emit({"type": "error", "message": str(exc)})

    yield _emit({"type": "done"})


# --------------------------------------------------------------------------- #
# Attorney matching — pure Claude reasoning, no scoring formula.
# Claude returns only (id, reason); we merge ids back to canonical profiles so
# it can't invent attorney details.
# --------------------------------------------------------------------------- #
RANK_TOOL = {
    "name": "rank_attorneys",
    "description": "Return the best-fit attorneys for this person, ranked best first.",
    "input_schema": {
        "type": "object",
        "properties": {
            "rankings": {
                "type": "array",
                "description": "The best-fit attorneys, best first.",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "The id of the attorney from the provided roster.",
                        },
                        "reason": {
                            "type": "string",
                            "description": "One sentence, specific to THIS person's situation, on why this attorney is a strong fit.",
                        },
                    },
                    "required": ["id", "reason"],
                },
            }
        },
        "required": ["rankings"],
    },
}

MATCH_SYSTEM = (
    "You match immigrants to immigration attorneys based purely on how well each "
    "attorney's focus fits the person's specific case — their category, country of "
    "chargeability, stage, and any risks. Reason about fit; do not use a scoring formula."
)


def match_attorneys(assessment: dict, top_n: int = 3) -> list[dict]:
    """Rank the roster for this assessment; return the top matches with reasons."""
    roster = "\n".join(
        f"- {a['id']}: {a['name']} — focus: {a['focus']}; specialties: "
        f"{', '.join(a['specialties'])}"
        for a in ATTORNEYS
    )

    watch = assessment.get("what_to_watch", "")
    if isinstance(watch, list):
        watch = "; ".join(
            w.get("what", "") for w in watch if isinstance(w, dict)
        )

    user = f"""ASSESSMENT OF THE PERSON:
Situation: {assessment.get('situation', '')}
Where they stand: {assessment.get('where_you_stand', '')}
Next step: {assessment.get('next_step', '')}
What to watch: {watch}

AVAILABLE ATTORNEYS:
{roster}

Pick the {top_n} best-fit attorneys for THIS person and rank them best first. For each, give one \
specific sentence on why they fit this person's case. Call the rank_attorneys tool."""

    msg = client.messages.create(
        model=MODEL,
        max_tokens=1000,
        system=MATCH_SYSTEM,
        tools=[RANK_TOOL],
        tool_choice={"type": "tool", "name": "rank_attorneys"},
        messages=[{"role": "user", "content": user}],
    )

    rankings = []
    for block in msg.content:
        if block.type == "tool_use" and block.name == "rank_attorneys":
            rankings = block.input.get("rankings", [])
            break

    matches: list[dict] = []
    seen: set[str] = set()
    for r in rankings:
        a = attorney_by_id(r.get("id", ""))
        if a and a["id"] not in seen:
            seen.add(a["id"])
            matches.append({**a, "reason": r.get("reason", "")})
    return matches[:top_n]


# --------------------------------------------------------------------------- #
# Attorney concierge chat — answers ONLY from that attorney's intake documents.
# --------------------------------------------------------------------------- #
def _case_context_block(case: dict | None) -> str:
    """Compact summary of the user's case, for tailoring document/prep advice."""
    if not case:
        return ""
    situation = str(case.get("situation", "")).strip()
    a = case.get("assessment", {}) or {}
    watch = a.get("what_to_watch", "")
    if isinstance(watch, list):
        watch = "; ".join(w.get("what", "") for w in watch if isinstance(w, dict))
    discr = a.get("discrepancies", []) or []
    discr_text = (
        "; ".join(
            f"{d.get('title', '')} ({d.get('severity', '')})"
            for d in discr
            if isinstance(d, dict)
        )
        or "none noted"
    )
    if not situation and not a:
        return ""
    return f"""

=== THIS PROSPECTIVE CLIENT'S CASE (use to TAILOR document/preparation advice) ===
In their words: {situation}
Situation: {a.get('situation', '')}
Where they stand: {a.get('where_you_stand', '')}
Document findings / risks: {discr_text}
Things they're watching: {watch}
=== END CASE ==="""


def _concierge_system(a: dict, case: dict | None = None) -> str:
    return f"""You are the friendly AI intake concierge for {a['name']} at {a['firm']} \
({a['location']}).

Speak in the first person for the office ("we", "our office"). Be warm, concise, and professional.

FIRM-POLICY questions (fees, consultations, process, what we handle): answer using ONLY the \
intake documents below. If something isn't covered, say you don't have that detail on hand and \
offer to pass it to {a['name']} or suggest a consultation. Do NOT invent fees, timelines, or \
policies, and do NOT give legal advice on the person's specific case.

DOCUMENT / PREPARATION questions ("what should I bring?", "how do I prepare?"): do NOT give a \
generic checklist. Use THIS CLIENT'S CASE (below, if provided) to produce a tailored plan:
- "Bring these for sure" — the specific documents that matter for THIS case, each with a \
one-line reason why it matters for them.
- "Bring these only if…" — conditional documents: state the condition and why it becomes \
relevant.
- Flag any document worth digging up because it could surface a timing issue or discrepancy \
(e.g. I-94 travel history, I-797 notices, I-140 approval, passport stamps, prior filings).
- End with 1-3 short follow-up questions to fill the most important gaps in what you know about \
their case.
If no case details are available, ask a couple of quick questions first rather than guessing.

Formatting: write for a small chat window. Use short paragraphs and, where it helps, simple \
Markdown — **bold** for key terms and "-" bullet lists. Do not use headings (#), tables, or \
code blocks.

=== INTAKE DOCUMENTS ===
{build_docs_text(a)}
=== END INTAKE DOCUMENTS ==={_case_context_block(case)}"""


def concierge_chat_stream(
    attorney_id: str, messages: list[dict], case: dict | None = None
) -> Iterator[str]:
    """Stream the concierge's reply (NDJSON token events) for a chat history."""
    a = attorney_by_id(attorney_id)
    if not a:
        yield _emit({"type": "error", "message": "Unknown attorney."})
        yield _emit({"type": "done"})
        return

    # Keep only well-formed user/assistant turns with text content.
    clean = [
        {"role": m["role"], "content": str(m["content"])}
        for m in messages
        if isinstance(m, dict)
        and m.get("role") in ("user", "assistant")
        and str(m.get("content", "")).strip()
    ]
    if not clean or clean[0]["role"] != "user":
        yield _emit({"type": "error", "message": "Chat must start with a user message."})
        yield _emit({"type": "done"})
        return

    try:
        with client.messages.stream(
            model=MODEL,
            max_tokens=900,
            system=_concierge_system(a, case),
            messages=clean,
        ) as stream:
            for event in stream:
                if (
                    event.type == "content_block_delta"
                    and event.delta.type == "text_delta"
                ):
                    yield _emit({"type": "token", "text": event.delta.text})
    except Exception as exc:
        yield _emit({"type": "error", "message": str(exc)})

    yield _emit({"type": "done"})


# --------------------------------------------------------------------------- #
# "What Next?" — a deep, scenario-specific action plan. Lazy / separate from the
# headline so /analyze stays fast.
# --------------------------------------------------------------------------- #
def _items(props: dict, required: list[str], desc: str) -> dict:
    return {
        "type": "array",
        "description": desc,
        "items": {"type": "object", "properties": props, "required": required},
    }


PLAN_TOOL = {
    "name": "deliver_plan",
    "description": "Deliver the full What-Next action plan. Call exactly once, after reasoning.",
    "input_schema": {
        "type": "object",
        "properties": {
            "immediate_actions": _items(
                {
                    "action": {"type": "string", "description": "The action to take in the next 24-72 hours."},
                    "why": {"type": "string", "description": "Why it matters and the risk/opportunity it addresses."},
                },
                ["action", "why"],
                "The most important actions for the next 24-72 hours, specific to this person.",
            ),
            "available_paths": _items(
                {
                    "path": {"type": "string", "description": "Name of the option/pathway."},
                    "when_available": {"type": "string", "description": "When it becomes available."},
                    "eligibility": {"type": "string", "description": "Basic eligibility considerations."},
                    "why_choose": {"type": "string", "description": "Why someone would choose it; key advantages."},
                    "limitations": {"type": "string", "description": "Important limitations, trade-offs, or risks."},
                },
                ["path", "why_choose"],
                "Every realistic option for THIS person, including creative ones where genuinely plausible (e.g. EB-1A/NIW self-petition, EB-3 downgrade, O-1, family/marriage-based, founding a company that sponsors them, cap-exempt employer).",
            ),
            "things_to_verify": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Facts to confirm before deciding — phrased as items to verify, not assumptions.",
            },
            "documents_to_organize": _items(
                {
                    "document": {"type": "string", "description": "The document."},
                    "why": {"type": "string", "description": "Why it matters."},
                    "when_needed": {"type": "string", "description": "When it may be needed."},
                },
                ["document", "why"],
                "Documents useful for the next steps, only those relevant to this case.",
            ),
            "hidden_considerations": _items(
                {
                    "consideration": {"type": "string", "description": "The strategic consideration."},
                    "detail": {"type": "string", "description": "Why it matters for this person."},
                },
                ["consideration", "detail"],
                "Considerations one or two levels deeper than the user asked, only genuinely relevant ones.",
            ),
            "scenario_exploration": _items(
                {
                    "scenario": {"type": "string", "description": "A realistic 'What if...' scenario for THIS person."},
                    "what_changes": {"type": "string", "description": "What changes in this scenario."},
                    "strategy_change": {"type": "string", "description": "How their strategy should change."},
                    "new_risks": {"type": "string", "description": "New risks, requirements, or opportunities."},
                },
                ["scenario", "strategy_change"],
                "2-4 realistic scenarios this person may encounter next (not generic).",
            ),
            "strategic_suggestions": _items(
                {
                    "suggestion": {"type": "string", "description": "An opportunity/alternative/strategy to explore."},
                    "why": {"type": "string", "description": "Why it may be worth considering."},
                },
                ["suggestion", "why"],
                "Proactive strategist insights the user may not have considered. Do not invent eligibility.",
            ),
            "recommended_next_steps": {
                "type": "array",
                "items": {"type": "string"},
                "description": "A concise, prioritized checklist ordered by urgency. Tailored and actionable.",
            },
        },
        "required": [
            "immediate_actions",
            "available_paths",
            "things_to_verify",
            "documents_to_organize",
            "hidden_considerations",
            "scenario_exploration",
            "strategic_suggestions",
            "recommended_next_steps",
        ],
    },
}

PLAN_SYSTEM = """You are an experienced U.S. immigration strategist. The user has ALREADY \
received a headline assessment of their situation. Your job now is NOT to summarize or repeat it \
— it is to produce a deeper, scenario-specific ACTION PLAN that helps them decide exactly what to \
do next and avoid common mistakes.

Source priority (highest first):
1. The user's stated situation — the primary case source for case type, timing, goals, constraints.
2. Uploaded-document findings included below — use them to confirm or correct the user's stated \
facts; if a document conflicts with what they said, treat the document as authoritative and flag \
the conflict.
3. The headline assessment below ALREADY reflects current USCIS data that was fetched live (visa \
bulletin cutoffs, processing times, policy) — reason from those facts. Prefer them over older \
memory; if a timing-sensitive detail isn't in the assessment, say it must be confirmed against \
the latest USCIS data rather than guessing.
4. Reasoning from verified facts — only recommend after checking facts; do not invent eligibility \
or assume unverified facts. If something is uncertain, say what must be confirmed before acting.

Conflict rule: prefer uploaded documents over user memory, and the assessment's current data over \
older knowledge. If a conflict matters, say so and explain its impact on the next step.

Produce ONLY the section you are asked for, highly personalized to THIS person, via the provided \
tool. For Available Paths, genuinely explore the most plausible options \
(including creative ones where they fit: EB-1A/NIW self-petition, EB-3 downgrade, O-1, a \
family/marriage-based path, founding a company that sponsors them, a cap-exempt employer) — \
explain the real choices rather than recommending only one. Do not repeat the headline \
assessment. Do not give generic immigration education. Keep it tight and high-signal — only the \
items that genuinely matter to THIS person. Think like a strategist anticipating the user's next \
questions."""


# What-Next is intentionally focused on the 3 sections that matter most to an
# immigrant deciding what to do. Each is fetched in its own short request and
# rendered progressively — no single long-running call.
SECTION_SCHEMAS = {
    "immediate_actions": PLAN_TOOL["input_schema"]["properties"]["immediate_actions"],
    "available_paths": PLAN_TOOL["input_schema"]["properties"]["available_paths"],
    "recommended_next_steps": PLAN_TOOL["input_schema"]["properties"][
        "recommended_next_steps"
    ],
}

SECTION_TITLES = {
    "immediate_actions": "Immediate actions (next 24-72 hours)",
    "available_paths": "Available paths and options",
    "recommended_next_steps": "Recommended next steps",
}


def _plan_context(situation: str, assessment: dict) -> str:
    watch = assessment.get("what_to_watch", "")
    if isinstance(watch, list):
        watch = "; ".join(w.get("what", "") for w in watch if isinstance(w, dict))
    discr = assessment.get("discrepancies", []) or []
    discr_text = (
        "; ".join(
            f"{d.get('title', '')} ({d.get('severity', '')})"
            for d in discr
            if isinstance(d, dict)
        )
        or "none"
    )
    return f"""THE PERSON'S OWN WORDS:
{situation}

THE HEADLINE ASSESSMENT (reflects current USCIS data; do NOT repeat it — go deeper):
- Situation: {assessment.get('situation', '')}
- Where they stand: {assessment.get('where_you_stand', '')}
- Immediate next step already noted: {assessment.get('next_step', '')}
- What to watch: {watch}
- Document findings: {discr_text}"""


def plan_section(section: str, situation: str, assessment: dict) -> list:
    """Generate ONE focused What-Next section (short, non-streaming JSON)."""
    schema = SECTION_SCHEMAS.get(section)
    if schema is None:
        return []
    tool = {
        "name": "deliver",
        "description": f"Return the '{SECTION_TITLES[section]}' for this person.",
        "input_schema": {
            "type": "object",
            "properties": {section: schema},
            "required": [section],
        },
    }
    user = _plan_context(situation, assessment) + (
        f"\n\nProduce ONLY the '{SECTION_TITLES[section]}' section now, as the `{section}` "
        "field. Keep it to the 3-4 items that matter most to THIS person."
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=2500,
        system=PLAN_SYSTEM,
        tools=[tool],
        tool_choice={"type": "tool", "name": "deliver"},
        messages=[{"role": "user", "content": user}],
    )
    for block in msg.content:
        if block.type == "tool_use" and block.name == "deliver":
            return block.input.get(section, [])
    return []


def plan_stream(situation: str, assessment: dict) -> Iterator[str]:
    """Yield NDJSON: search status, sources, then the structured action plan."""
    watch = assessment.get("what_to_watch", "")
    if isinstance(watch, list):
        watch = "; ".join(w.get("what", "") for w in watch if isinstance(w, dict))
    discr = assessment.get("discrepancies", []) or []
    discr_text = (
        "; ".join(
            f"{d.get('title', '')} ({d.get('severity', '')})"
            for d in discr
            if isinstance(d, dict)
        )
        or "none"
    )

    user = f"""THE PERSON'S OWN WORDS:
{situation}

THE HEADLINE ASSESSMENT ALREADY GIVEN (reflects current USCIS data; do NOT repeat it — go deeper):
- Situation: {assessment.get('situation', '')}
- Where they stand: {assessment.get('where_you_stand', '')}
- Immediate next step already noted: {assessment.get('next_step', '')}
- What to watch: {watch}
- Document findings: {discr_text}

Now build the full What-Next action plan, reasoning from the facts above. Call deliver_plan with \
all eight sections."""

    try:
        # Force the structured tool (no web_search) so the model responds directly,
        # and emit a heartbeat as the large tool input streams — this keeps the
        # HTTP connection alive across proxies during the long generation.
        with client.messages.stream(
            model=MODEL,
            max_tokens=8000,
            system=PLAN_SYSTEM,
            tools=[PLAN_TOOL],
            tool_choice={"type": "tool", "name": "deliver_plan"},
            messages=[{"role": "user", "content": user}],
        ) as stream:
            for event in stream:
                if (
                    event.type == "content_block_delta"
                    and event.delta.type == "input_json_delta"
                ):
                    yield _emit({"type": "progress"})
            final = stream.get_final_message()

        plan = None
        for block in final.content:
            if block.type == "tool_use" and block.name == "deliver_plan":
                plan = block.input
                break

        if plan:
            yield _emit({"type": "plan", "data": plan})
        else:
            yield _emit(
                {"type": "error", "message": "The model did not return a plan. Please try again."}
            )
    except Exception as exc:
        yield _emit({"type": "error", "message": str(exc)})

    yield _emit({"type": "done"})
