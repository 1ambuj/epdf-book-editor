"""Build a sample PDF with a lined glossary table for first-run testing."""

from __future__ import annotations

from pathlib import Path

import pymupdf as fitz

ROWS = [
    ("Term", "Meaning"),
    ("CSR Rules", "Companies (CSR Policy) Rules, 2014."),
    ("CSRN", "CSR Network - internal implementation body."),
    ("FCRA", "Foreign Contribution (Regulation) Act, 2010."),
    ("GC", "General Circular issued by the MCA."),
    ("FY", "Financial year."),
    ("NGO", "Non-governmental organisation as implementing agency."),
    ("Schedule VII", "Activities listed in Schedule VII of the Companies Act, 2013."),
]


def build(path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    page.draw_rect(fitz.Rect(0, 0, 595, 842), color=(0.96, 0.94, 0.88), fill=(0.96, 0.94, 0.88))
    page.insert_text((54, 64), "CSR PRACTICAL HANDBOOK", fontsize=11, color=(0.55, 0.32, 0.08))
    page.insert_text((54, 96), "Definitions & Abbreviations", fontsize=22, color=(0.12, 0.08, 0.05))
    page.insert_textbox(
        fitz.Rect(54, 118, 540, 168),
        "This sample page is generated so you can test table extraction. "
        "Each row below is a real PDF table cell with drawn borders.",
        fontsize=11,
        color=(0.22, 0.18, 0.14),
    )

    y0 = 180
    x0, x1 = 54, 541
    col_x = 210
    heights = [36] + [46] * (len(ROWS) - 1)
    y1 = y0 + sum(heights)

    page.draw_rect(fitz.Rect(x0, y0, x1, y1), color=(0.82, 0.74, 0.58), fill=(1, 1, 1), width=1)
    page.draw_rect(fitz.Rect(x0, y0, x1, y0 + heights[0]), color=(0.82, 0.74, 0.58), fill=(0.96, 0.90, 0.76), width=1)
    page.draw_line(fitz.Point(col_x, y0), fitz.Point(col_x, y1), color=(0.82, 0.74, 0.58), width=1)
    y = y0
    for h in heights[:-1]:
        y += h
        page.draw_line(fitz.Point(x0, y), fitz.Point(x1, y), color=(0.82, 0.74, 0.58), width=1)

    y = y0
    for i, (term, meaning) in enumerate(ROWS):
        h = heights[i]
        page.insert_textbox(fitz.Rect(60, y + 8, col_x - 8, y + h - 6), term, fontsize=10, color=(0.35, 0.2, 0.05))
        page.insert_textbox(fitz.Rect(col_x + 8, y + 8, 535, y + h - 6), meaning, fontsize=10, color=(0.15, 0.12, 0.1))
        y += h

    page.insert_text((54, 800), "CSR_Practical Handbook - 2026", fontsize=9, color=(0.45, 0.38, 0.28))
    page.insert_text((470, 800), "Page 1", fontsize=9, color=(0.45, 0.38, 0.28))

    page2 = doc.new_page(width=595, height=842)
    page2.draw_rect(fitz.Rect(0, 0, 595, 842), color=(0.96, 0.94, 0.88), fill=(0.96, 0.94, 0.88))
    page2.insert_text((54, 72), "How to use this template", fontsize=20, color=(0.12, 0.08, 0.05))
    page2.insert_textbox(
        fitz.Rect(54, 110, 540, 260),
        "Upload your own PDF on the home page. The extractor keeps tables as real HTML tables "
        "so cells stay editable. If a PDF table has no lines, the app also tries to rebuild it "
        "from aligned columns. You can still insert, paste, or convert text into a table in the editor.",
        fontsize=12,
        color=(0.18, 0.14, 0.1),
    )
    page2.insert_text((54, 800), "CSR_Practical Handbook - 2026", fontsize=9, color=(0.45, 0.38, 0.28))
    page2.insert_text((470, 800), "Page 2", fontsize=9, color=(0.45, 0.38, 0.28))

    doc.save(path)
    doc.close()
    return path
