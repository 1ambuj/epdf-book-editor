"""ePDF with Template — upload PDF/Word, pick a template, edit, publish."""

from __future__ import annotations

import json
import shutil
import uuid
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from services.catalog import cover_preview_html, default_id, get_template, list_templates, preview_html
from services.exporter import html_to_pdf
from services.ingest import SOURCE_EXTS, extract_source
from services.mapper import apply_template, load_template, read_template_uploads
from services.manuscript import wrap_manuscript
from services.paginate import count_pages

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
WORK = ROOT / "work"
SAMPLE = ROOT / "sample"

# Starlette default is 1MB per multipart part — Word/PDF + pasted HTML/CSS
# templates are often larger and used to 400 with "Part exceeded maximum size of 1024KB."
MAX_UPLOAD_PART = 100 * 1024 * 1024

app = FastAPI(title="ePDF with Template")
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.on_event("startup")
def _startup():
    WORK.mkdir(parents=True, exist_ok=True)
    SAMPLE.mkdir(parents=True, exist_ok=True)
    from services.sample_pdf import build as build_pdf
    from services.sample_word import build as build_word

    pdf = SAMPLE / "sample.pdf"
    if not pdf.exists():
        build_pdf(pdf)
    docx = SAMPLE / "sample.docx"
    if not docx.exists():
        build_word(docx)


def job_dir(job_id: str) -> Path:
    path = WORK / job_id
    path.mkdir(parents=True, exist_ok=True)
    (path / "media").mkdir(exist_ok=True)
    return path


def save_meta(path: Path, data: dict) -> None:
    (path / "meta.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_meta(path: Path) -> dict:
    meta_file = path / "meta.json"
    if not meta_file.exists():
        raise HTTPException(404, "Job not found")
    return json.loads(meta_file.read_text(encoding="utf-8"))


@app.get("/", response_class=HTMLResponse)
def landing():
    return HTMLResponse(
        (STATIC / "index.html").read_text(encoding="utf-8"),
        headers={"Cache-Control": "no-store"},
    )


@app.get("/create", response_class=HTMLResponse)
@app.get("/templates", response_class=HTMLResponse)
def landing_alias():
    return landing()


@app.get("/editor", response_class=HTMLResponse)
def editor():
    return HTMLResponse(
        (STATIC / "editor.html").read_text(encoding="utf-8"),
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/jobs")
def list_jobs():
    items = []
    if not WORK.exists():
        return {"jobs": items}
    folders = sorted(
        (p for p in WORK.iterdir() if p.is_dir() and (p / "meta.json").exists()),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for path in folders[:12]:
        try:
            meta = json.loads((path / "meta.json").read_text(encoding="utf-8"))
        except Exception:
            continue
        mtime = path.stat().st_mtime
        items.append(
            {
                "id": meta.get("id") or path.name,
                "title": meta.get("title") or "Untitled book",
                "source_name": meta.get("source_name") or "",
                "template_id": meta.get("template_id") or "",
                "page_count": meta.get("page_count") or 0,
                "updated": int(mtime * 1000),
            }
        )
    return {"jobs": items}


@app.post("/api/blank")
async def blank(payload: dict = Body(default={})):
    payload = payload or {}
    title = str(payload.get("title") or "Untitled book").strip() or "Untitled book"
    job_id = uuid.uuid4().hex[:12]
    path = job_dir(job_id)
    extracted = (
        f"<h1>{title}</h1>"
        "<p>Start writing on this page. Click any line to edit.</p>"
        "<p>When you are ready, choose a book format and a template.</p>"
    )
    (path / "extracted.html").write_text(extracted, encoding="utf-8")
    document_html = wrap_manuscript(extracted, title)
    (path / "document.html").write_text(document_html, encoding="utf-8")
    meta = {
        "id": job_id,
        "title": title,
        "page_count": 1,
        "table_count": 0,
        "source_name": "blank",
        "template_id": None,
        "template_applied": False,
    }
    save_meta(path, meta)
    return {"job_id": job_id, **meta}


@app.get("/api/templates")
def templates():
    return {"templates": list_templates(), "default_id": default_id()}


@app.get("/api/templates/{template_id}")
def template_detail(template_id: str):
    tpl = get_template(template_id)
    if not tpl:
        raise HTTPException(404, "Template not found")
    return tpl


@app.get("/api/templates/{template_id}/preview", response_class=HTMLResponse)
def template_preview(template_id: str):
    html = preview_html(template_id)
    if not html:
        raise HTTPException(404, "Template not found")
    return html


@app.get("/api/templates/{template_id}/cover", response_class=HTMLResponse)
def template_cover(template_id: str):
    html = cover_preview_html(template_id)
    if not html:
        raise HTTPException(404, "Template not found")
    return HTMLResponse(html, headers={"Cache-Control": "public, max-age=3600"})


@app.get("/api/sample-pdf")
def sample_pdf():
    from services.sample_pdf import build

    path = SAMPLE / "sample.pdf"
    if not path.exists():
        build(path)
    return FileResponse(path, filename="sample-handbook.pdf", media_type="application/pdf")


@app.get("/api/sample-word")
def sample_word():
    from services.sample_word import build

    path = SAMPLE / "sample.docx"
    if not path.exists():
        build(path)
    return FileResponse(
        path,
        filename="sample-handbook.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@app.post("/api/process")
async def process(request: Request):
    from services.mapper import apply_template, load_template, read_template_uploads

    try:
        form = await request.form(max_part_size=MAX_UPLOAD_PART)
    except Exception as exc:
        detail = getattr(exc, "detail", None) or str(exc)
        if "maximum size" in str(detail).lower() or "1024kb" in str(detail).lower():
            raise HTTPException(
                400,
                "Upload is too large. Word/PDF and template HTML/CSS are supported up to 100MB — refresh the page and try again.",
            ) from exc
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(400, str(detail)) from exc
    source = form.get("source") or form.get("file") or form.get("pdf") or form.get("word")
    if source is None or not getattr(source, "filename", ""):
        raise HTTPException(400, "Please upload a Word (.docx) or PDF file")

    filename = str(source.filename)
    ext = Path(filename).suffix.lower()
    if ext not in SOURCE_EXTS:
        raise HTTPException(400, "This file type is not supported. Please upload .docx, .doc, or .pdf.")

    job_id = uuid.uuid4().hex[:12]
    path = job_dir(job_id)
    source_path = path / f"source{ext}"
    source_path.write_bytes(await source.read())

    try:
        extracted = extract_source(source_path, path / "media")
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc

    original = Path(filename).stem
    if extracted.get("title") in ("source", source_path.stem, "") and original:
        extracted["title"] = original

    uploads = []
    for item in form.getlist("template_files"):
        if getattr(item, "filename", None):
            uploads.append((item.filename, await item.read()))

    html_src, css_src, extra = read_template_uploads(uploads)
    template_html_text = str(form.get("template_html_text") or "")
    template_css_text = str(form.get("template_css_text") or "")
    template_id = str(form.get("template_id") or "").strip()
    use_custom = str(form.get("use_custom") or "") in {"1", "true", "yes"}
    if use_custom:
        if template_html_text.strip():
            html_src = template_html_text
        if template_css_text.strip():
            css_src = template_css_text
    else:
        html_src = None if not uploads else html_src
        css_src = None if not uploads else css_src

    catalog_tpl = get_template(template_id) if template_id else None
    used_custom = use_custom or bool(uploads)
    if catalog_tpl and not html_src:
        html_src = catalog_tpl["html"]
        if not css_src:
            css_src = catalog_tpl["css"]
    if not html_src:
        fallback = get_template(default_id())
        html_src, css_src = fallback["html"], fallback["css"]
        template_id = default_id()

    for name, data in extra.items():
        (path / "media" / Path(name).name).write_bytes(data)

    extracted_html = extracted["html"]
    (path / "extracted.html").write_text(extracted_html, encoding="utf-8")
    media_base = f"/api/jobs/{job_id}/media"
    title = extracted["title"]
    document_html = wrap_manuscript(extracted_html.replace("__MEDIA__", media_base.rstrip("/")), title)
    (path / "document.html").write_text(document_html, encoding="utf-8")

    meta = {
        "id": job_id,
        "title": title,
        "page_count": 1,
        "table_count": extracted["table_count"],
        "source_name": filename,
        "template_id": None,
        "template_applied": False,
    }
    save_meta(path, meta)
    return {"job_id": job_id, **meta}


def _body_inner(html: str) -> str:
    import re

    match = re.search(r"<body[^>]*>(.*)</body>", html, re.I | re.S)
    return match.group(1).strip() if match else html.strip()


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    path = WORK / job_id
    meta = load_meta(path)
    html = (path / "document.html").read_text(encoding="utf-8")
    extracted_file = path / "extracted.html"
    extracted_html = extracted_file.read_text(encoding="utf-8") if extracted_file.exists() else ""
    template_applied = meta.get("template_applied")
    if template_applied is None:
        template_applied = bool(meta.get("template_id")) and "title-page" in html
    meta["page_count"] = count_pages(html) if template_applied else 1
    return {
        **meta,
        "html": html,
        "extracted_html": extracted_html,
        "template_applied": template_applied,
    }


@app.post("/api/jobs/{job_id}/save")
async def save_job(job_id: str, payload: dict):
    path = WORK / job_id
    meta = load_meta(path)
    html = payload.get("html")
    if not html:
        raise HTTPException(400, "Missing html")
    mode = str(payload.get("mode") or "design").strip().lower()
    title = meta.get("title") or "Document"
    if mode == "draft":
        inner = _body_inner(html)
        (path / "extracted.html").write_text(inner, encoding="utf-8")
        if not meta.get("template_applied"):
            media_base = f"/api/jobs/{job_id}/media"
            wrapped = wrap_manuscript(inner.replace("__MEDIA__", media_base.rstrip("/")), title)
            (path / "document.html").write_text(wrapped, encoding="utf-8")
            meta["page_count"] = 1
    else:
        (path / "document.html").write_text(html, encoding="utf-8")
        meta["page_count"] = count_pages(html)
    if payload.get("title"):
        meta["title"] = payload["title"]
    save_meta(path, meta)
    return {"ok": True}


@app.post("/api/jobs/{job_id}/apply-template")
async def apply_job_template(job_id: str, payload: dict):
    from services.mapper import apply_template, load_template

    path = WORK / job_id
    meta = load_meta(path)
    extracted_file = path / "extracted.html"
    if not extracted_file.exists():
        raise HTTPException(400, "Original extracted content missing")
    tpl = get_template(str(payload.get("template_id") or ""))
    if not tpl:
        raise HTTPException(404, "Template not found")
    extracted = extracted_file.read_text(encoding="utf-8")
    template = load_template(tpl["html"], tpl["css"])
    media_base = f"/api/jobs/{job_id}/media"
    document_html = apply_template(template, extracted, meta.get("title") or tpl["name"], media_base)
    (path / "document.html").write_text(document_html, encoding="utf-8")
    meta["template_id"] = tpl["id"]
    meta["template_applied"] = True
    meta["page_count"] = count_pages(document_html)
    save_meta(path, meta)
    return {"ok": True, "html": document_html, "template_id": tpl["id"]}


@app.get("/api/jobs/{job_id}/media/{filename}")
def get_media(job_id: str, filename: str):
    file_path = (WORK / job_id / "media" / filename).resolve()
    media_root = (WORK / job_id / "media").resolve()
    if media_root not in file_path.parents and file_path != media_root:
        raise HTTPException(403, "Invalid path")
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)


@app.post("/api/jobs/{job_id}/publish")
async def publish(job_id: str, payload: dict):
    path = WORK / job_id
    meta = load_meta(path)
    html = payload.get("html")
    if not html:
        html = (path / "document.html").read_text(encoding="utf-8")
    else:
        (path / "document.html").write_text(html, encoding="utf-8")

    pdf_path = path / "published.pdf"
    try:
        html_to_pdf(html, pdf_path)
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc

    filename = f"{_safe_name(meta.get('title') or 'ebook')}.pdf"
    return FileResponse(pdf_path, filename=filename, media_type="application/pdf")


@app.post("/api/jobs/{job_id}/reset")
def reset_workspace(job_id: str):
    path = WORK / job_id
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)
    return {"ok": True}


def _safe_name(name: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "._- " else "_" for ch in name).strip()
    return cleaned or "ebook"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
