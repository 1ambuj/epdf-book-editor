"""Extract text, tables, and images from a PDF into structured HTML."""

from __future__ import annotations

import re
from pathlib import Path

import pymupdf as fitz
import pdfplumber


TABLE_STRATEGIES = [
    {
        "vertical_strategy": "lines",
        "horizontal_strategy": "lines",
        "snap_tolerance": 4,
        "join_tolerance": 4,
        "edge_min_length": 3,
        "min_words_vertical": 1,
        "min_words_horizontal": 1,
    },
    {
        "vertical_strategy": "lines_strict",
        "horizontal_strategy": "lines",
        "snap_tolerance": 5,
        "join_tolerance": 5,
    },
    {
        "vertical_strategy": "text",
        "horizontal_strategy": "text",
        "snap_tolerance": 6,
        "join_tolerance": 6,
        "min_words_vertical": 2,
        "text_x_tolerance": 2,
        "text_y_tolerance": 3,
        "intersection_x_tolerance": 8,
        "intersection_y_tolerance": 8,
    },
]


def extract_pdf(pdf_path: str | Path, media_dir: Path) -> dict:
    pdf_path = Path(pdf_path)
    media_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    title = (doc.metadata or {}).get("title") or pdf_path.stem
    pages_out = []

    with pdfplumber.open(pdf_path) as plumber:
        for index, plumber_page in enumerate(plumber.pages):
            fitz_page = doc[index]
            page_data = _extract_page(
                plumber_page, fitz_page, index, media_dir
            )
            pages_out.append(page_data)

    doc.close()

    html = _pages_to_html(title, pages_out)
    table_count = sum(
        1 for p in pages_out for b in p["blocks"] if b["type"] == "table"
    )
    return {
        "title": title,
        "page_count": len(pages_out),
        "table_count": table_count,
        "pages": pages_out,
        "html": html,
    }


def _extract_page(plumber_page, fitz_page, index: int, media_dir: Path) -> dict:
    tables = _extract_tables(plumber_page)
    table_bboxes = [t["bbox"] for t in tables]

    images = _extract_images(fitz_page, index, media_dir)
    text_blocks = _extract_text_blocks(fitz_page, table_bboxes)

    blocks = _merge_blocks(text_blocks, tables, images)
    if not any(b["type"] == "table" for b in blocks):
        inferred = _infer_table_from_text(plumber_page, table_bboxes)
        if inferred:
            blocks.append(inferred)
            blocks.sort(key=lambda b: b.get("top", 0))

    return {"number": index + 1, "blocks": blocks}


def _extract_tables(page) -> list[dict]:
    line_settings = TABLE_STRATEGIES[:2]
    text_settings = TABLE_STRATEGIES[2:]

    lined = _tables_with_settings(page, line_settings)
    if lined:
        return _dedupe_tables(lined)

    textual = _tables_with_settings(page, text_settings)
    return _dedupe_tables(textual)


def _tables_with_settings(page, settings_list) -> list[dict]:
    best: list[dict] = []
    best_score = -1
    for settings in settings_list:
        try:
            found = page.find_tables(table_settings=settings) or []
        except Exception:
            continue

        candidates = []
        for table in found:
            try:
                data = table.extract()
            except Exception:
                continue
            cleaned = _clean_table(data)
            if not _is_useful_table(cleaned):
                continue
            candidates.append(
                {
                    "type": "table",
                    "bbox": table.bbox,
                    "top": table.bbox[1],
                    "rows": cleaned,
                    "html": _table_html(cleaned),
                }
            )

        score = _score_tables(candidates)
        if score > best_score:
            best_score = score
            best = candidates
    return best


def _clean_table(data) -> list[list[str]]:
    rows = []
    for row in data or []:
        cells = [("" if c is None else str(c)).replace("\n", " ").strip() for c in row]
        if any(cells):
            rows.append(cells)

    if not rows:
        return []

    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]

    # Drop fully empty columns
    keep = [
        i
        for i in range(width)
        if any((rows[r][i] or "").strip() for r in range(len(rows)))
    ]
    if keep:
        rows = [[row[i] for i in keep] for row in rows]
    return rows


def _is_useful_table(rows: list[list[str]]) -> bool:
    if len(rows) < 2:
        return False
    cols = len(rows[0]) if rows else 0
    if cols < 2:
        return False
    cells = [(c or "").strip() for row in rows for c in row]
    filled = [c for c in cells if c]
    if len(filled) < 3:
        return False
    avg = sum(len(c) for c in filled) / len(filled)
    # Word-wrapped prose split into fake columns
    if cols >= 5 and avg < 22:
        return False
    if cols >= 8:
        return False
    return True


def _score_tables(tables: list[dict]) -> int:
    score = 0
    for t in tables:
        rows = t["rows"]
        cols = len(rows[0]) if rows else 0
        if not rows or not cols:
            continue
        filled = sum(1 for row in rows for cell in row if (cell or "").strip())
        density = filled / (len(rows) * cols)
        score += filled * 2 + len(rows) * 4
        score += int(density * 40)
        if 2 <= cols <= 4 and density >= 0.55:
            score += 40
        if cols >= 6 and density < 0.55:
            score -= 80
        # Fragmented wrap: many short leftover cells
        shorts = sum(1 for row in rows for cell in row if 0 < len((cell or "").strip()) <= 3)
        if shorts > len(rows):
            score -= 30
    return score


def _dedupe_tables(tables: list[dict]) -> list[dict]:
    kept: list[dict] = []
    for table in sorted(tables, key=lambda t: t["top"]):
        if any(_bbox_overlap(table["bbox"], k["bbox"]) > 0.55 for k in kept):
            continue
        kept.append(table)
    return kept


def _bbox_overlap(a, b) -> float:
    ax0, at, ax1, ab = a
    bx0, bt, bx1, bb = b
    ix0, iy0 = max(ax0, bx0), max(at, bt)
    ix1, iy1 = min(ax1, bx1), min(ab, bb)
    if ix1 <= ix0 or iy1 <= iy0:
        return 0.0
    inter = (ix1 - ix0) * (iy1 - iy0)
    area_a = max(1.0, (ax1 - ax0) * (ab - at))
    area_b = max(1.0, (bx1 - bx0) * (bb - bt))
    return inter / min(area_a, area_b)


def _inside_table(bbox, table_bboxes, pad: float = 3.0) -> bool:
    x0, y0, x1, y1 = bbox
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    for tx0, ty0, tx1, ty1 in table_bboxes:
        if tx0 - pad <= cx <= tx1 + pad and ty0 - pad <= cy <= ty1 + pad:
            return True
    return False


def _extract_text_blocks(fitz_page, table_bboxes: list) -> list[dict]:
    data = fitz_page.get_text("dict")
    sizes: list[float] = []
    raw_blocks = []
    page_h = fitz_page.rect.height

    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        bbox = tuple(block["bbox"])
        if bbox[1] > page_h - 58:
            continue
        if _inside_table(bbox, table_bboxes):
            continue

        lines_out = []
        max_size = 0.0
        color = "#222222"
        for line in block.get("lines", []):
            spans = []
            for span in line.get("spans", []):
                text = (span.get("text") or "").strip()
                if not text:
                    continue
                size = float(span.get("size") or 11)
                sizes.append(size)
                max_size = max(max_size, size)
                color = _int_to_hex(span.get("color", 0))
                spans.append(text)
            if spans:
                lines_out.append(" ".join(spans))

        text = "\n".join(lines_out).strip()
        if not text:
            continue

        pipe_table = _pipe_or_tab_table(text)
        if pipe_table:
            raw_blocks.append(
                {
                    "type": "table",
                    "bbox": bbox,
                    "top": bbox[1],
                    "rows": pipe_table,
                    "html": _table_html(pipe_table),
                }
            )
            continue

        raw_blocks.append(
            {
                "type": "text",
                "bbox": bbox,
                "top": bbox[1],
                "text": text,
                "size": max_size,
                "color": color,
            }
        )

    median = sorted(sizes)[len(sizes) // 2] if sizes else 11.0
    for block in raw_blocks:
        if block["type"] != "text":
            continue
        size = block["size"]
        text = block["text"]
        if size >= median * 1.7 or (len(text) < 80 and size >= median * 1.35):
            block["type"] = "heading"
            block["level"] = 1 if size >= median * 1.9 else 2
        else:
            block["type"] = "paragraph"
    return raw_blocks


def _pipe_or_tab_table(text: str) -> list[list[str]] | None:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2:
        return None

    if all("|" in ln for ln in lines):
        rows = [[c.strip() for c in ln.strip("|").split("|")] for ln in lines]
        rows = [r for r in rows if any(c and not set(c) <= set("-: ") for c in r)]
        if _is_useful_table(rows):
            return rows

    if all("\t" in ln for ln in lines):
        rows = [[c.strip() for c in ln.split("\t")] for ln in lines]
        if _is_useful_table(rows):
            return rows

    # Multiple spaces used as columns
    split_rows = [re.split(r"\s{2,}", ln) for ln in lines]
    widths = {len(r) for r in split_rows}
    if len(widths) == 1 and list(widths)[0] >= 2 and _is_useful_table(split_rows):
        return split_rows
    return None


def _infer_table_from_text(page, existing_bboxes: list) -> dict | None:
    """Rebuild a table when the PDF has no drawn lines (common in ebooks)."""
    words = page.extract_words(x_tolerance=2, y_tolerance=3, keep_blank_chars=False)
    if not words or len(words) < 6:
        return None

    words = [
        w
        for w in words
        if not _inside_table((w["x0"], w["top"], w["x1"], w["bottom"]), existing_bboxes)
    ]
    if len(words) < 6:
        return None

    # Cluster into rows by Y
    words = sorted(words, key=lambda w: (round(w["top"], 1), w["x0"]))
    rows_words: list[list] = []
    for word in words:
        if not rows_words or abs(word["top"] - rows_words[-1][0]["top"]) > 4:
            rows_words.append([word])
        else:
            rows_words[-1].append(word)

    if len(rows_words) < 3:
        return None

    # Cluster X positions into columns
    xs = sorted(w["x0"] for w in words)
    columns = _cluster_positions(xs, gap=18)
    if len(columns) < 2:
        return None

    table_rows = []
    for row in rows_words:
        cells = [""] * len(columns)
        for word in row:
            col = min(range(len(columns)), key=lambda i: abs(word["x0"] - columns[i]))
            cells[col] = (cells[col] + " " + word["text"]).strip()
        if any(cells):
            table_rows.append(cells)

    table_rows = _clean_table(table_rows)
    if not _is_useful_table(table_rows):
        return None
    # Avoid turning a whole page of prose into a 2-col "table"
    avg_len = sum(len(c) for row in table_rows for c in row) / max(1, sum(len(r) for r in table_rows))
    if avg_len > 80:
        return None
    cols = len(table_rows[0])
    filled = sum(1 for row in table_rows for cell in row if (cell or "").strip())
    density = filled / (len(table_rows) * cols)
    if cols > 4 or density < 0.6:
        return None

    tops = [row[0]["top"] for row in rows_words]
    bottoms = [row[-1]["bottom"] for row in rows_words]
    bbox = (
        min(w["x0"] for w in words),
        min(tops),
        max(w["x1"] for w in words),
        max(bottoms),
    )
    return {
        "type": "table",
        "bbox": bbox,
        "top": bbox[1],
        "rows": table_rows,
        "html": _table_html(table_rows),
        "inferred": True,
    }


def _cluster_positions(values: list[float], gap: float) -> list[float]:
    if not values:
        return []
    clusters = [[values[0]]]
    for value in values[1:]:
        if value - clusters[-1][-1] > gap:
            clusters.append([value])
        else:
            clusters[-1].append(value)
    return [sum(c) / len(c) for c in clusters]


def _extract_images(fitz_page, page_index: int, media_dir: Path) -> list[dict]:
    images = []
    for img_i, img in enumerate(fitz_page.get_images(full=True)):
        xref = img[0]
        try:
            info = fitz_page.get_image_rects(xref)
            bbox = tuple(info[0]) if info else (0, 0, 0, 0)
        except Exception:
            bbox = (0, 0, 0, 0)

        try:
            extracted = fitz_page.parent.extract_image(xref)
        except Exception:
            continue
        raw = extracted.get("image")
        ext = (extracted.get("ext") or "png").lower()
        if ext == "jpeg":
            ext = "jpg"
        if not raw:
            continue

        # Skip tiny icons
        if extracted.get("width", 80) < 40 or extracted.get("height", 80) < 40:
            continue

        name = f"p{page_index + 1}_img{img_i + 1}.{ext}"
        path = media_dir / name
        path.write_bytes(raw)
        images.append(
            {
                "type": "image",
                "bbox": bbox,
                "top": bbox[1] if bbox else 0,
                "src": name,
            }
        )
    return images


def _merge_blocks(text_blocks, tables, images) -> list[dict]:
    blocks = list(text_blocks) + list(tables) + list(images)
    blocks.sort(key=lambda b: (b.get("top", 0), b.get("bbox", [0, 0, 0, 0])[0] if b.get("bbox") else 0))
    return blocks


def _table_html(rows: list[list[str]]) -> str:
    if not rows:
        return "<table class='epdf-table'><tbody></tbody></table>"
    header = rows[0]
    body = rows[1:]
    thead = "<thead><tr>" + "".join(f"<th>{_esc(c)}</th>" for c in header) + "</tr></thead>"
    tbody = "<tbody>"
    for row in body:
        tbody += "<tr>" + "".join(f"<td>{_esc(c)}</td>" for c in row) + "</tr>"
    tbody += "</tbody>"
    return f"<table class='epdf-table'>{thead}{tbody}</table>"


def _pages_to_html(title: str, pages: list[dict]) -> str:
    parts = []
    for page in pages:
        inner = []
        for block in page["blocks"]:
            kind = block["type"]
            if kind == "heading":
                level = int(block.get("level") or 2)
                tag = "h1" if level == 1 else "h2"
                inner.append(f"<{tag}>{_esc(block['text'])}</{tag}>")
            elif kind == "paragraph":
                text = _esc(block["text"]).replace("\n", "<br>")
                inner.append(f"<p>{text}</p>")
            elif kind == "table":
                inner.append(block["html"])
            elif kind == "image":
                inner.append(
                    f"<figure class='epdf-figure'><img src='__MEDIA__/{block['src']}' alt=''></figure>"
                )
        parts.append(
            f"<section class='epdf-page' data-page='{page['number']}'>"
            f"{''.join(inner) or '<p></p>'}"
            f"<div class='epdf-page-footer'><span class='epdf-doc-title'>{_esc(title)}</span>"
            f"<span class='epdf-page-num'>Page {page['number']}</span></div>"
            f"</section>"
        )
    return "".join(parts)


def _esc(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _int_to_hex(color: int) -> str:
    color = int(color or 0)
    return f"#{color:06x}"
