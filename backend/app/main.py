"""OpenJetty Immigration Navigator — FastAPI app.

Endpoints:
- GET  /health   liveness + readiness (key configured?)
- POST /analyze  stream reasoning, then a structured assessment (NDJSON)
"""
import base64

from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .claude_client import MODEL, is_configured
from .config import ALLOWED_ORIGINS
from .engine import (
    IMAGE_MEDIA_TYPES,
    analyze_stream,
    concierge_chat_stream,
    match_attorneys,
    plan_section,
    plan_stream,
)

# Upload guardrails (demo-sane).
MAX_FILES = 5
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB each
ACCEPTED_MEDIA_TYPES = {"application/pdf", *IMAGE_MEDIA_TYPES}

app = FastAPI(title="OpenJetty Immigration Navigator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Liveness + readiness probe consumed by the frontend shell."""
    return {
        "status": "ok",
        "service": "openjetty-backend",
        "model": MODEL,
        "anthropic_configured": is_configured(),
    }


@app.post("/analyze")
async def analyze(
    situation: str = Form(...),
    files: list[UploadFile] = File(default=[]),
):
    """Stream reasoning, then the structured assessment.

    Accepts a plain-text situation plus optional document uploads (PDF/images),
    which the model cross-references against the description.
    """
    if not situation.strip():
        raise HTTPException(status_code=422, detail="situation must not be empty")
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=413, detail=f"At most {MAX_FILES} files.")

    documents: list[dict] = []
    for f in files:
        mt = (f.content_type or "").split(";")[0].strip()
        if mt not in ACCEPTED_MEDIA_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {f.filename} ({mt or 'unknown'}).",
            )
        data = await f.read()
        if len(data) > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=413, detail=f"{f.filename} exceeds 10 MB."
            )
        documents.append(
            {
                "media_type": mt,
                "data": base64.standard_b64encode(data).decode("ascii"),
                "name": f.filename or "document",
            }
        )

    return StreamingResponse(
        analyze_stream(situation, documents),
        media_type="application/x-ndjson",
    )


@app.post("/match")
def match(assessment: dict = Body(...)):
    """Rank the best-fit attorneys for a completed assessment."""
    return {"matches": match_attorneys(assessment)}


@app.post("/plan")
def plan(payload: dict = Body(...)):
    """Stream the deep What-Next action plan for a completed assessment."""
    situation = str(payload.get("situation", ""))
    assessment = payload.get("assessment", {})
    if not isinstance(assessment, dict):
        raise HTTPException(status_code=422, detail="assessment must be an object")
    return StreamingResponse(
        plan_stream(situation, assessment),
        media_type="application/x-ndjson",
    )


@app.post("/plan/section")
def plan_section_endpoint(payload: dict = Body(...)):
    """Generate ONE focused What-Next section (short request, plain JSON).

    The frontend calls this in parallel per section and renders each as it lands.
    """
    section = str(payload.get("section", ""))
    situation = str(payload.get("situation", ""))
    assessment = payload.get("assessment", {})
    if not isinstance(assessment, dict):
        raise HTTPException(status_code=422, detail="assessment must be an object")
    return {"section": section, "data": plan_section(section, situation, assessment)}


@app.post("/concierge/chat")
def concierge_chat(payload: dict = Body(...)):
    """Stream the attorney concierge's reply, grounded in their intake docs."""
    attorney_id = str(payload.get("attorney_id", ""))
    messages = payload.get("messages", [])
    case = payload.get("case_context")
    if not isinstance(messages, list):
        raise HTTPException(status_code=422, detail="messages must be a list")
    if case is not None and not isinstance(case, dict):
        case = None
    return StreamingResponse(
        concierge_chat_stream(attorney_id, messages, case),
        media_type="application/x-ndjson",
    )
