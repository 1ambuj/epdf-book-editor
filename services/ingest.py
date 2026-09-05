"""Turn any supported source file into extracted HTML."""

from __future__ import annotations

from pathlib import Path

from services.extractor import extract_pdf
from services.paginate import count_pages, reflow_book
from services.word import extract_word

SOURCE_EXTS = {".pdf", ".docx", ".docm", ".doc", ".dot", ".rtf"}


def extract_source(path: str | Path, media_dir: Path) -> dict:
    path = Path(path)
    ext = path.suffix.lower()
    if ext == ".pdf":
        out = extract_pdf(path, media_dir)
    elif ext in SOURCE_EXTS:
        out = extract_word(path, media_dir)
    else:
        raise ValueError(f"Unsupported file type: {ext}. Upload PDF or Word (.docx / .doc).")
    out["html"] = reflow_book(out.get("html") or "", out.get("title") or path.stem)
    out["page_count"] = max(1, count_pages(out["html"]))
    return out
