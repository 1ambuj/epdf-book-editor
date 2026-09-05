"""20 book templates — each aimed at a kind of book an author would actually write."""

from __future__ import annotations

from services.book_previews import cover_for_template, for_template as preview_pages
from services.designs import get_design

SPECS = [
    dict(id="cream-handbook", name="Cream Handbook", category="Handbook",
         best_for="Training manuals, SOPs, company handbooks",
         blurb="Cream paper and gold rules — the desk book staff actually keep open.",
         layout="classic", hfont="Libre Baskerville", bfont="Source Sans 3",
         bg="#fffaf2", ink="#2b241c", accent="#b45309", thead="#f6e7c3", tborder="#e8d9b8"),
    dict(id="corporate-navy", name="Corporate Navy", category="Business",
         best_for="Playbooks, policy books, leadership notes",
         blurb="Navy spine energy for a book the board will flip in a meeting.",
         layout="bar", hfont="Source Serif 4", bfont="Source Sans 3",
         bg="#ffffff", ink="#0f172a", accent="#1e3a8a", thead="#dbeafe", tborder="#93c5fd"),
    dict(id="magazine-bold", name="Magazine Bold", category="Magazine",
         best_for="Essay collections, features, thought-leadership books",
         blurb="Big type and a pull-quote — for writers who want a magazine that binds.",
         layout="masthead", hfont="Playfair Display", bfont="Inter",
         bg="#fff7ed", ink="#111827", accent="#dc2626", thead="#fee2e2", tborder="#fecaca"),
    dict(id="minimal-snow", name="Minimal Snow", category="Literary",
         best_for="Poetry, memoir, quiet literary novels",
         blurb="White space is the design. For books that should not shout.",
         layout="classic", hfont="Inter", bfont="Inter",
         bg="#ffffff", ink="#171717", accent="#525252", thead="#f5f5f5", tborder="#e5e5e5"),
    dict(id="night-gold", name="Night & Gold", category="Luxury",
         best_for="Gala books, private catalogues, evening editions",
         blurb="Dark page, gold type — dress-code for a luxury volume.",
         layout="framed", hfont="Cormorant Garamond", bfont="Karla",
         bg="#111113", ink="#f5e6c8", accent="#d4af37", thead="#2a2416", tborder="#5c4b1f"),
    dict(id="academic-serif", name="Academic Serif", category="Academic",
         best_for="Thesis, textbooks, research monographs",
         blurb="Abstract, numbered heads, footnotes — a serious scholarly page.",
         layout="classic", hfont="EB Garamond", bfont="Source Sans 3",
         bg="#fbfaf6", ink="#1c1917", accent="#44403c", thead="#e7e5e4", tborder="#d6d3d1"),
    dict(id="startup-sky", name="Startup Sky", category="Guide",
         best_for="Product manuals, founder guides, onboarding books",
         blurb="Clear steps and airy type for a book your intern can follow.",
         layout="masthead", hfont="Outfit", bfont="Outfit",
         bg="#f0f9ff", ink="#0c4a6e", accent="#0284c7", thead="#e0f2fe", tborder="#7dd3fc"),
    dict(id="legal-brief", name="Legal Brief", category="Legal",
         best_for="Bound briefs, compliance volumes, white papers",
         blurb="Centred caption, annexure table — looks like it belongs in a filing.",
         layout="classic", hfont="Times New Roman", bfont="Georgia",
         bg="#ffffff", ink="#1c1917", accent="#7f1d1d", thead="#fef2f2", tborder="#e5e7eb"),
    dict(id="annual-navy", name="Annual Report", category="Report",
         best_for="Yearbooks, donor reports, board books",
         blurb="Numbers in tables, then the human paragraph. For yearly volumes.",
         layout="bar", hfont="Merriweather", bfont="Lato",
         bg="#f8fafc", ink="#0b1f3a", accent="#0f766e", thead="#ccfbf1", tborder="#99f6e4"),
    dict(id="cookbook-rust", name="Cookbook Rust", category="Cookbook",
         best_for="Recipe books, home cooking, food memoirs",
         blurb="Ingredients table + method steps. The page cooks photograph.",
         layout="classic", hfont="Fraunces", bfont="Nunito",
         bg="#fff7ed", ink="#431407", accent="#c2410c", thead="#ffedd5", tborder="#fdba74"),
    dict(id="storybook", name="Storybook", category="Children",
         best_for="Picture books, read-aloud stories, early chapter books",
         blurb="Friendly type, a picture frame, a cast table for young readers.",
         layout="masthead", hfont="Fredoka", bfont="Nunito",
         bg="#fff1f2", ink="#4a044e", accent="#db2777", thead="#fce7f3", tborder="#f9a8d4"),
    dict(id="tech-slate", name="Tech Slate", category="Technical",
         best_for="API handbooks, runbooks, internal engineering books",
         blurb="Slate and cyan — the volume on-call actually opens.",
         layout="bar", hfont="IBM Plex Sans", bfont="IBM Plex Sans",
         bg="#f8fafc", ink="#0f172a", accent="#0891b2", thead="#ecfeff", tborder="#67e8f9"),
    dict(id="blush-invite", name="Blush Invite", category="Occasion",
         best_for="Wedding booklets, memorial programmes, family ceremonies",
         blurb="Script title, gentle schedule table — held in the hand during vows.",
         layout="framed", hfont="Great Vibes", bfont="Cormorant Garamond",
         bg="#fff1f2", ink="#4c0519", accent="#be185d", thead="#fce7f3", tborder="#fbcfe8"),
    dict(id="newsprint", name="Newsprint", category="Journalism",
         best_for="Collected reporting, longform, city books",
         blurb="Headline, dateline, fact box — a newspaper that became a book.",
         layout="masthead", hfont="Old Standard TT", bfont="Source Serif 4",
         bg="#f5f0e6", ink="#1c1917", accent="#171717", thead="#e7e5e4", tborder="#a8a29e"),
    dict(id="obsidian-luxe", name="Obsidian Luxe", category="Catalogue",
         best_for="Fashion lookbooks, jewellery catalogues, studio line sheets",
         blurb="Black page, champagne type, a table of looks.",
         layout="framed", hfont="Cinzel", bfont="Raleway",
         bg="#0a0a0a", ink="#fde68a", accent="#f59e0b", thead="#1c1917", tborder="#92400e"),
    dict(id="forest-journal", name="Forest Journal", category="Journal",
         best_for="Nature writing, travel journals, field notebooks",
         blurb="Moss greens and room in the margin for a sketch.",
         layout="classic", hfont="Lora", bfont="Karla",
         bg="#f0fdf4", ink="#14532d", accent="#166534", thead="#dcfce7", tborder="#86efac"),
    dict(id="lilac-soft", name="Lilac Soft", category="Workbook",
         best_for="Courses, coaching workbooks, self-help with exercises",
         blurb="Fill-in tables and kind type for a book people write in.",
         layout="classic", hfont="Quicksand", bfont="Nunito",
         bg="#faf5ff", ink="#3b0764", accent="#7e22ce", thead="#f3e8ff", tborder="#d8b4fe"),
    dict(id="royal-maroon", name="Royal Maroon", category="Culture",
         best_for="Festival guides, family vidhi books, cultural handbooks",
         blurb="Maroon and gold for a ceremonial volume kept in the house.",
         layout="bar", hfont="Tiro Devanagari Hindi", bfont="Noto Sans",
         bg="#fffbeb", ink="#450a0a", accent="#9f1239", thead="#fef3c7", tborder="#fcd34d"),
    dict(id="clinic-teal", name="Clinic Teal", category="Health",
         best_for="Patient guides, NGO health books, clinic take-home packs",
         blurb="Calm teal, short sentences, a table a family can read in a hurry.",
         layout="classic", hfont="Figtree", bfont="Figtree",
         bg="#f0fdfa", ink="#134e4a", accent="#0f766e", thead="#ccfbf1", tborder="#5eead4"),
    dict(id="studio-red", name="Studio Red", category="Portfolio",
         best_for="Artist books, design portfolios, selected-works volumes",
         blurb="A red strike on white — title loud, caption quiet.",
         layout="masthead", hfont="Archivo Black", bfont="Archivo",
         bg="#ffffff", ink="#0a0a0a", accent="#e11d48", thead="#ffe4e6", tborder="#fb7185"),
    dict(id="legrand-research", name="Legrand Research", category="Research",
         best_for="Thesis reports, lab documentation, internship write-ups, technical monographs",
         blurb="Legrand-style academic book — chapter banners, ocre accents, serif body for serious research.",
         layout="classic", hfont="Jost", bfont="PT Serif",
         bg="#ffffff", ink="#1a1a1a", accent="#34b1c9", thead="#f0f9fb", tborder="#d8d8d8"),
    dict(id="column-gazette", name="Column Gazette", category="Magazine",
         best_for="Newsletters, journals, magazines, briefing papers, two-column reports",
         blurb="Clean two-column magazine page — open space between columns, no divider, modern type.",
         layout="masthead", hfont="Source Serif 4", bfont="Source Sans 3",
         bg="#ffffff", ink="#0f172a", accent="#0ea5e9", thead="#f8fafc", tborder="#e2e8f0"),
]


def list_templates() -> list[dict]:
    return [_meta(s) for s in SPECS]


def get_template(template_id: str) -> dict | None:
    spec = _find(template_id)
    if not spec:
        return None
    meta = _meta(spec)
    meta["html"], meta["css"] = _html(spec), _css(spec)
    return meta


PREVIEW_SKIN = """
html, body { background: #b7b7b7 !important; }
body.tpl { padding: 8px 0 64px; }
.ebook-shell { max-width: 794px; margin: 0 auto; padding: 12px 0 48px; }
.theme-running { text-align: center; margin: 0 0 16px; }
.epdf-page {
  width: 794px;
  max-width: calc(100vw - 48px);
  margin: 0 auto 40px !important;
  box-shadow: 0 14px 36px rgba(0,0,0,.28) !important;
}
.cover-page, .chapter-hero { min-height: 1123px !important; }
@media (max-width: 840px) {
  .epdf-page { width: calc(100vw - 32px); min-height: auto !important; }
}
"""

THUMB_SKIN = """
html, body {
  margin: 0;
  padding: 0;
  background: #f1f5f9;
  overflow: hidden;
  height: 100%;
}
.epdf-page {
  width: 794px !important;
  max-width: none !important;
  margin: 0 !important;
  min-height: 1123px !important;
  box-shadow: none !important;
}
.demo-banner { display: none !important; }
.epdf-page-footer { opacity: 0.85; }
"""


def preview_html(template_id: str) -> str | None:
    tpl = get_template(template_id)
    if not tpl:
        return None
    from services.mapper import apply_template, load_template

    shell = load_template(tpl["html"], tpl["css"])
    html = apply_template(shell, preview_pages(tpl["id"]), tpl["name"] + " — sample book", "/static")
    if "</head>" in html:
        html = html.replace(
            "</head>",
            f"<style data-epdf-preview='1'>{PREVIEW_SKIN}</style></head>",
            1,
        )
    return html


def cover_preview_html(template_id: str) -> str | None:
    tpl = get_template(template_id)
    if not tpl:
        return None
    from services.mapper import apply_template, load_template

    shell = load_template(tpl["html"], tpl["css"])
    html = apply_template(shell, cover_for_template(tpl["id"]), tpl["name"], "/static")
    if "</head>" in html:
        html = html.replace(
            "</head>",
            f"<style data-epdf-thumb='1'>{THUMB_SKIN}</style></head>",
            1,
        )
    return html


def default_id() -> str:
    return SPECS[0]["id"]


def _find(template_id: str):
    tid = (template_id or "").strip().lower()
    for spec in SPECS:
        if spec["id"] == tid:
            return spec
    return None


def _meta(spec: dict) -> dict:
    keys = (
        "id", "name", "category", "best_for", "blurb", "layout",
        "hfont", "bfont", "bg", "ink", "accent", "thead", "tborder",
    )
    out = {k: spec[k] for k in keys}
    out["description"] = spec["blurb"]
    out["heading_font"] = spec["hfont"]
    out["body_font"] = spec["bfont"]
    out["table_head"] = spec["thead"]
    out["table_border"] = spec["tborder"]
    out["preview_pages"] = 14
    return out


def _html(spec: dict) -> str:
    design = get_design(spec["id"])
    if design:
        return design[0]
    return """<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body><main data-epdf-slot="content"></main></body></html>"""


def _css(spec: dict) -> str:
    design = get_design(spec["id"])
    if design:
        return design[1]
    return "body{font-family:sans-serif}"
