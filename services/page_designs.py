"""Real book-page chrome: designed cover + back, quiet body, light chapter openers."""

from __future__ import annotations


def _spec(tid: str) -> dict:
    from services.catalog import SPECS

    for s in SPECS:
        if s["id"] == tid:
            return s
    return SPECS[0]


PAGE_VARS = """
:root {
  --page-w: 794px;
  --page-h: 1123px;
  --page-pad-x: 64px;
  --page-pad-y: 80px;
  --col-gap: 28px;
}
"""

PAGE_FRAME = """
.ebook-shell {
  max-width: var(--page-w);
  margin: 0 auto;
  padding: 28px 16px 72px;
}
.theme-running { display: none !important; }
.navy-bar, .mag-bleed, .leaf, .rings, .sky-head, .report-hero,
.cook-band, .story-sky, .invite-top, .wash, .duo, .t-mark,
.studio-hero, .legrand-band { display: none !important; }

.epdf-page {
  width: var(--page-w);
  min-height: var(--page-h);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: var(--page-pad-y) var(--page-pad-x) 56px;
}
.epdf-page p { margin: 0 0 0.85em; line-height: 1.65; }
.epdf-page h2 { margin: 1.4em 0 0.6em; }
.epdf-page h2:first-child, .epdf-page h1:first-child { margin-top: 0; }

/* —— BODY: almost blank paper —— */
.epdf-page:not(.cover-page):not(.title-page):not(.back-page) .epdf-page-footer {
  margin-top: auto;
  padding-top: 18px;
  border-top: none;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 10px;
  letter-spacing: 0.06em;
  opacity: 0.55;
}
.epdf-page:not(.cover-page):not(.title-page):not(.back-page) .epdf-doc-title {
  font-style: italic;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.epdf-page:not(.cover-page):not(.title-page):not(.back-page) .epdf-page-num {
  font-variant-numeric: lining-nums;
  font-style: normal;
  letter-spacing: 0.04em;
}

.cover-page,
.title-page,
.back-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.cover-page .epdf-page-footer,
.title-page .epdf-page-footer,
.back-page .epdf-page-footer {
  border: 0;
  opacity: 0.45;
  justify-content: center;
}
.cover-page .epdf-page-num,
.title-page .epdf-page-num,
.back-page .epdf-page-num { display: none; }

.chapter-page > h1:first-child,
.chapter-page > h2:first-child {
  break-after: avoid;
}
"""


def layout_chrome(layout: str, accent: str, ink: str, paper: str) -> str:
    """Body pages stay quiet. Layout only changes tiny running-header / chapter cues."""
    a, i, _p = accent, ink, paper

    # Shared book body + chapter opener (all layouts)
    base = f"""
/* running header hairline — body only */
.epdf-page:not(.cover-page):not(.title-page):not(.back-page):not(.chapter-page)::before {{
  content: "";
  position: absolute;
  top: 36px;
  left: var(--page-pad-x);
  right: var(--page-pad-x);
  height: 1px;
  background: {i};
  opacity: 0.12;
}}

/* chapter opener — book style, not a web banner */
.chapter-page:not(.back-page) {{
  padding-top: 140px;
}}
.chapter-page:not(.back-page) .chapter-hero-banner {{
  background: none !important;
  aspect-ratio: auto !important;
  min-height: 0 !important;
  width: auto !important;
  margin: 0 0 28px !important;
  padding: 0 !important;
  display: block !important;
  text-align: center;
}}
.chapter-page:not(.back-page) .chapter-hero-banner span {{
  display: block;
  font-size: 11px !important;
  letter-spacing: 0.28em !important;
  text-transform: uppercase !important;
  color: {a} !important;
  font-weight: 600 !important;
  opacity: 1 !important;
}}
.chapter-page:not(.back-page) .chapter-hero-banner::after {{
  content: "❧";
  display: block;
  margin-top: 14px;
  font-size: 18px;
  color: {a};
  opacity: 0.7;
  letter-spacing: 0;
}}
.chapter-page:not(.back-page) > h1:first-of-type,
.chapter-page:not(.back-page) > h2:first-of-type,
.chapter-page:not(.back-page) .chapter-hero-banner + h1,
.chapter-page:not(.back-page) .chapter-hero-banner + h2 {{
  text-align: center;
  border: 0 !important;
  padding: 0 0 8px !important;
  margin: 0 0 36px !important;
  font-size: 1.65em;
  line-height: 1.25;
}}
"""

    if layout == "bar":
        return base + f"""
/* trade / business book: tiny accent on chapter only */
.chapter-page:not(.back-page) .chapter-hero-banner::before {{
  content: "";
  display: block;
  width: 48px;
  height: 3px;
  background: {a};
  margin: 0 auto 16px;
}}
.chapter-page:not(.back-page) .chapter-hero-banner::after {{ content: none; }}
"""
    if layout == "masthead":
        return base + f"""
/* magazine / gazette: folio style running title on body */
.epdf-page:not(.cover-page):not(.title-page):not(.back-page):not(.chapter-page) .epdf-doc-title {{
  text-transform: uppercase;
  font-style: normal;
  letter-spacing: 0.14em;
  font-size: 9px;
}}
.chapter-page:not(.back-page) .chapter-hero-banner::after {{ content: "—"; opacity: 0.5; }}
"""
    if layout == "framed":
        return base + f"""
/* luxury / invite: soft outer margin rule on body only */
.epdf-page:not(.cover-page):not(.title-page):not(.back-page) {{
  box-shadow: inset 0 0 0 1px {a}22;
}}
.chapter-page:not(.back-page) .chapter-hero-banner::after {{ content: "◆"; font-size: 12px; }}
"""
    # classic literary
    return base + f"""
.chapter-page:not(.back-page) .chapter-hero-banner::after {{ content: "❧"; }}
.epdf-page:not(.cover-page):not(.title-page):not(.back-page) p {{
  text-align: justify;
  hyphens: auto;
}}
"""


def cover_chrome(tid: str, accent: str, ink: str, paper: str) -> str:
    """Front matter — the designed pages of the book."""
    a, i, p = accent, ink, paper
    base = f"""
.tpl-{tid} .cover-page,
.tpl-{tid} .title-page {{
  text-align: center;
  justify-content: center;
}}
.tpl-{tid} .cover-page .doc-title,
.tpl-{tid} .title-page .doc-title,
.tpl-{tid} .cover-page .book-title,
.tpl-{tid} .cover-page h1 {{
  margin-left: auto;
  margin-right: auto;
}}
"""
    designs: dict[str, str] = {
        "cream-handbook": f"""
.tpl-cream-handbook .cover-page {{
  background:
    linear-gradient({p}, {p}) padding-box,
    linear-gradient(180deg, #f6e7c3, {p} 40%) border-box;
  border: 14px solid transparent;
  box-shadow: inset 0 0 0 1px {a}66;
}}
.tpl-cream-handbook .cover-page::before {{
  content: ""; display: block; width: 72px; height: 2px; background: {a};
  margin: 0 auto 28px;
}}
.tpl-cream-handbook .cover-page::after {{
  content: ""; display: block; width: 72px; height: 2px; background: {a};
  margin: 28px auto 0;
}}
""",
        "corporate-navy": f"""
.tpl-corporate-navy .cover-page {{
  background: linear-gradient(180deg, #12305a 0 38%, {p} 38%);
  color: {i};
  text-align: left;
  justify-content: flex-end;
  padding-bottom: 96px;
}}
.tpl-corporate-navy .cover-page .doc-title,
.tpl-corporate-navy .cover-page .book-title,
.tpl-corporate-navy .cover-page h1 {{
  color: #12305a; text-transform: uppercase; letter-spacing: 0.04em;
  margin-left: 0; text-align: left;
}}
.tpl-corporate-navy .cover-page::before {{
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: #e11d48;
}}
""",
        "magazine-bold": f"""
.tpl-magazine-bold .cover-page {{
  background: {p};
  border-top: 28px solid #f5c518;
  border-bottom: 12px solid #111;
  text-align: left; justify-content: flex-end; padding-bottom: 80px;
}}
.tpl-magazine-bold .cover-page .doc-title,
.tpl-magazine-bold .cover-page .book-title {{
  font-size: 3.2em !important; line-height: 0.92; letter-spacing: -0.03em;
  margin-left: 0; text-align: left;
}}
""",
        "minimal-snow": f"""
.tpl-minimal-snow .cover-page {{ padding-top: 28%; }}
.tpl-minimal-snow .cover-page::before {{
  content: ""; display: block; width: 40px; height: 1px; background: {i}; opacity: 0.35; margin: 0 auto 40px;
}}
.tpl-minimal-snow .cover-page::after {{
  content: "❧"; display: block; margin-top: 48px; color: #86efac; font-size: 28px; opacity: 0.7;
}}
""",
        "night-gold": f"""
.tpl-night-gold .cover-page {{
  background: radial-gradient(ellipse at 70% 15%, {a}40 0%, transparent 45%), #16140f;
  color: #f5e6c8;
  box-shadow: inset 0 0 0 1px {a}55;
}}
.tpl-night-gold .cover-page::before {{
  content: "✦"; font-size: 22px; color: {a}; display: block; margin-bottom: 24px;
}}
""",
        "academic-serif": f"""
.tpl-academic-serif .cover-page {{
  box-shadow: inset 0 0 0 1px {i}, inset 0 0 0 12px {p}, inset 0 0 0 13px {i};
}}
.tpl-academic-serif .cover-page .doc-title,
.tpl-academic-serif .cover-page .book-title {{
  border-top: 2px solid {i}; border-bottom: 1px solid {i};
  padding: 18px 24px; display: inline-block; max-width: 90%;
}}
""",
        "startup-sky": f"""
.tpl-startup-sky .cover-page {{
  background: linear-gradient(165deg, #0b1f3a 0 32%, {p} 32%);
  text-align: left; justify-content: flex-end; padding-bottom: 88px;
}}
.tpl-startup-sky .cover-page .doc-title {{ margin-left: 0; text-align: left; }}
""",
        "legal-brief": f"""
.tpl-legal-brief .cover-page {{
  border: 10px double #7f1d1d; padding: 64px 48px;
}}
.tpl-legal-brief .cover-page .doc-title {{
  text-transform: uppercase; letter-spacing: 0.12em; font-size: 1.35em !important;
}}
""",
        "annual-navy": f"""
.tpl-annual-navy .cover-page {{
  background: linear-gradient(180deg, transparent 55%, #0b1f3a 55%),
    radial-gradient(circle at 50% 30%, #f97316, #7c2d12 40%, #0f172a 70%);
  color: #fff; justify-content: flex-end; padding-bottom: 72px;
}}
.tpl-annual-navy .cover-page .doc-title {{ color: #fff; }}
""",
        "cookbook-rust": f"""
.tpl-cookbook-rust .cover-page {{
  border-top: 48px solid #c2410c; border-bottom: 16px solid #fdba74;
}}
.tpl-cookbook-rust .cover-page .doc-title {{ color: #c2410c !important; }}
""",
        "storybook": f"""
.tpl-storybook .cover-page {{
  border-radius: 28px;
  background: linear-gradient(180deg, #f472b6 0 22%, {p} 22%);
}}
.tpl-storybook .cover-page::after {{
  content: "Once upon a page"; display: block; margin-top: 36px;
  font-size: 14px; letter-spacing: 0.12em; color: #db2777;
}}
""",
        "tech-slate": f"""
.tpl-tech-slate .cover-page {{
  background: #0f172a; color: #67e8f9; box-shadow: inset 0 0 0 1px #164e63;
  text-align: left; justify-content: flex-end; padding-bottom: 88px;
}}
.tpl-tech-slate .cover-page::before {{
  content: ""; position: absolute; top: 48px; left: 64px; right: 64px; height: 2px;
  background: #67e8f9; box-shadow: 0 0 18px #67e8f988;
}}
.tpl-tech-slate .cover-page .doc-title {{ color: #67e8f9; margin-left: 0; text-align: left; }}
""",
        "blush-invite": f"""
.tpl-blush-invite .cover-page {{
  border: 1px solid {a}44; box-shadow: inset 0 0 0 18px {p}, inset 0 0 0 19px #0f766e;
}}
.tpl-blush-invite .cover-page::before {{
  content: "together"; display: block; letter-spacing: 0.42em; text-transform: uppercase;
  font-size: 11px; color: #0f766e; margin-bottom: 32px;
}}
""",
        "newsprint": f"""
.tpl-newsprint .cover-page {{
  background: #efe8d8; border-top: 8px solid #111; border-bottom: 8px solid #111;
}}
.tpl-newsprint .cover-page .doc-title {{
  border-top: 4px solid #111; border-bottom: 1px solid #111;
  padding: 12px 0; display: inline-block;
}}
""",
        "obsidian-luxe": f"""
.tpl-obsidian-luxe .cover-page {{
  background: radial-gradient(circle at 20% 0%, #1e3a8a 0%, transparent 42%), #07101f;
  color: #fde68a; box-shadow: inset 0 0 0 1px #1e3a8a;
}}
.tpl-obsidian-luxe .cover-page::before {{
  content: "COLLECTION"; display: block; letter-spacing: 0.4em; font-size: 11px;
  color: #38bdf8; margin-bottom: 28px;
}}
""",
        "forest-journal": f"""
.tpl-forest-journal .cover-page {{
  background:
    radial-gradient(circle at 25% 20%, #34d39955 0 12%, transparent 13%),
    radial-gradient(circle at 78% 70%, #6ee7b755 0 14%, transparent 15%),
    {p};
  box-shadow: inset 0 0 0 1px #86efac88;
}}
""",
        "lilac-soft": f"""
.tpl-lilac-soft .cover-page {{
  border-radius: 20px;
  border-top: 28px solid transparent;
  border-image: linear-gradient(90deg, #fb923c 50%, #38bdf8 50%) 1;
}}
""",
        "royal-maroon": f"""
.tpl-royal-maroon .cover-page {{
  border: 14px solid #9f1239; outline: 4px solid #fcd34d; outline-offset: 8px;
}}
.tpl-royal-maroon .cover-page::before {{
  content: "॥"; display: block; font-size: 28px; color: #9f1239; margin-bottom: 16px;
}}
""",
        "clinic-teal": f"""
.tpl-clinic-teal .cover-page {{
  border-top: 56px solid #0f766e;
  border-radius: 0 0 40% 40% / 0 0 28px 28px;
}}
.tpl-clinic-teal .cover-page::before {{
  content: "+"; display: block; width: 44px; height: 44px; margin: -8px auto 24px;
  border: 2px solid #0f766e; border-radius: 50%; line-height: 40px; color: #0f766e; font-size: 24px;
}}
""",
        "studio-red": f"""
.tpl-studio-red .cover-page {{
  background: linear-gradient(180deg, #fecdd3 0 26%, {p} 26%);
  text-align: left; justify-content: flex-end; padding-bottom: 80px;
}}
.tpl-studio-red .cover-page .doc-title {{ margin-left: 0; text-align: left; }}
.tpl-studio-red .cover-page::after {{
  content: ""; display: block; width: 64px; height: 6px; background: #e11d48; margin-top: 24px;
}}
""",
        "legrand-research": f"""
.tpl-legrand-research .cover-page {{
  background: linear-gradient(135deg, #0f2d3a 0 36%, {p} 36%);
  text-align: left; justify-content: flex-end; padding-bottom: 88px;
}}
.tpl-legrand-research .cover-page .doc-title {{ margin-left: 0; text-align: left; }}
.tpl-legrand-research .cover-page::before {{
  content: "RESEARCH MONOGRAPH"; position: absolute; top: 48px; left: 64px;
  font-size: 11px; letter-spacing: 0.22em; color: #fff; opacity: 0.85;
}}
""",
        "column-gazette": f"""
.tpl-column-gazette .cover-page {{
  column-count: 1 !important;
  border-bottom: 6px solid {a};
  text-align: left; justify-content: flex-end; padding-bottom: 72px;
}}
.tpl-column-gazette .cover-page::before {{
  content: ""; display: block; height: 10px; background: {a};
  margin: calc(-1 * var(--page-pad-y)) calc(-1 * var(--page-pad-x)) 40px;
}}
.tpl-column-gazette .cover-page .doc-title {{ margin-left: 0; text-align: left; }}
""",
    }
    return base + designs.get(
        tid,
        f"""
.tpl-{tid} .cover-page {{
  box-shadow: inset 0 0 0 1px {a}44;
}}
.tpl-{tid} .cover-page::before {{
  content: ""; display: block; width: 56px; height: 2px; background: {a}; margin: 0 auto 28px;
}}
""",
    )


def back_chrome(tid: str, accent: str, ink: str, paper: str) -> str:
    """Colophon / last page — designed close, not another body page."""
    a, i, p = accent, ink, paper
    base = f"""
.tpl-{tid} .back-page {{
  text-align: center;
  justify-content: center;
}}
.tpl-{tid} .back-page .chapter-hero-banner {{ display: none !important; }}
.tpl-{tid} .back-page::after {{
  display: block;
  margin-top: 36px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  font-size: 11px;
  color: {a};
}}
"""
    designs: dict[str, str] = {
        "cream-handbook": f'.tpl-cream-handbook .back-page::after {{ content: "— Finis —"; }}\n'
        f".tpl-cream-handbook .back-page {{ box-shadow: inset 0 0 0 1px {a}55; }}\n",
        "corporate-navy": """.tpl-corporate-navy .back-page {
  background: linear-gradient(180deg, """ + p + """ 58%, #12305a 58%);
}
.tpl-corporate-navy .back-page::after {
  content: "End of document"; color: #fff; margin-top: auto; padding: 32px;
}
""",
        "magazine-bold": """.tpl-magazine-bold .back-page { border-bottom: 20px solid #f5c518; }
.tpl-magazine-bold .back-page::after { content: "The End"; font-size: 28px; letter-spacing: 0.08em; font-weight: 800; }
""",
        "minimal-snow": '.tpl-minimal-snow .back-page::after { content: "·"; font-size: 42px; letter-spacing: 0; text-transform: none; opacity: 0.35; }\n',
        "night-gold": f""".tpl-night-gold .back-page {{
  background: #16140f; color: #f5e6c8; box-shadow: inset 0 0 0 1px {a}55;
}}
.tpl-night-gold .back-page::after {{ content: "✦"; font-size: 22px; letter-spacing: 0; text-transform: none; }}
""",
        "academic-serif": f""".tpl-academic-serif .back-page {{
  box-shadow: inset 0 0 0 1px {i}, inset 0 0 0 12px {p}, inset 0 0 0 13px {i};
}}
.tpl-academic-serif .back-page::after {{ content: "Explicit"; font-variant: small-caps; }}
""",
        "startup-sky": '.tpl-startup-sky .back-page::after { content: "Thanks for reading"; }\n',
        "legal-brief": """.tpl-legal-brief .back-page { border: 10px double #7f1d1d; }
.tpl-legal-brief .back-page::after { content: "— End of brief —"; }
""",
        "annual-navy": """.tpl-annual-navy .back-page {
  background: linear-gradient(180deg, """ + p + """ 60%, #0b1f3a 60%); color: #fff;
}
.tpl-annual-navy .back-page::after { content: "Annual close"; color: #fff; margin-top: auto; padding: 28px; }
""",
        "cookbook-rust": '.tpl-cookbook-rust .back-page::after { content: "Bon appétit"; font-style: italic; text-transform: none; letter-spacing: 0.06em; font-size: 22px; }\n',
        "storybook": f""".tpl-storybook .back-page {{
  border-radius: 28px; background: linear-gradient(0deg, #f472b6 0 16%, {p} 16%);
}}
.tpl-storybook .back-page::after {{ content: "The End"; font-size: 26px; text-transform: none; letter-spacing: 0.04em; }}
""",
        "tech-slate": """.tpl-tech-slate .back-page {
  background: #0f172a; color: #67e8f9; box-shadow: inset 0 0 0 1px #164e63;
}
.tpl-tech-slate .back-page::after { content: "EOF"; font-family: ui-monospace, monospace; letter-spacing: 0.2em; }
""",
        "blush-invite": '.tpl-blush-invite .back-page::after { content: "With love"; font-family: "Great Vibes", cursive; font-size: 36px; text-transform: none; letter-spacing: 0; }\n',
        "newsprint": """.tpl-newsprint .back-page { background: #efe8d8; border-top: 6px solid #111; border-bottom: 6px solid #111; }
.tpl-newsprint .back-page::after { content: "30 —"; font-weight: 800; }
""",
        "obsidian-luxe": """.tpl-obsidian-luxe .back-page {
  background: #07101f; color: #fde68a; box-shadow: inset 0 0 0 1px #1e3a8a;
}
.tpl-obsidian-luxe .back-page::after { content: "◆"; font-size: 18px; letter-spacing: 0; text-transform: none; }
""",
        "forest-journal": '.tpl-forest-journal .back-page::after { content: "Field notes closed"; }\n',
        "lilac-soft": '.tpl-lilac-soft .back-page::after { content: "Your work begins here"; }\n',
        "royal-maroon": """.tpl-royal-maroon .back-page {
  border: 14px solid #9f1239; outline: 4px solid #fcd34d; outline-offset: 8px;
}
.tpl-royal-maroon .back-page::after { content: "॥ शुभम् ॥"; text-transform: none; letter-spacing: 0.1em; font-size: 18px; }
""",
        "clinic-teal": '.tpl-clinic-teal .back-page::after { content: "Take care"; }\n',
        "studio-red": '.tpl-studio-red .back-page::after { content: "Selected works"; }\n',
        "legrand-research": '.tpl-legrand-research .back-page::after { content: "References · Appendix · End"; }\n',
        "column-gazette": f""".tpl-column-gazette .back-page {{ column-count: 1 !important; border-top: 4px solid {a}; }}
.tpl-column-gazette .back-page::after {{ content: "Edition complete"; }}
""",
    }
    return base + designs.get(tid, f'.tpl-{tid} .back-page::after {{ content: "— End —"; }}\n')


def chapter_hero_css(accent: str) -> str:
    # Chapter look is owned by layout_chrome (book openers). Keep hook empty-safe.
    return f"""
.chapter-hero-banner {{ background: transparent; }}
.back-page .chapter-hero-banner {{ display: none !important; }}
/* accent token kept for callers */ :root {{ --chapter-accent: {accent}; }}
"""


def augment_css(template_id: str, css: str) -> str:
    spec = _spec(template_id)
    layout = spec.get("layout") or "classic"
    accent = spec.get("accent") or "#2563eb"
    ink = spec.get("ink") or "#111827"
    paper = spec.get("bg") or "#ffffff"
    return (
        css
        + PAGE_VARS
        + PAGE_FRAME
        + layout_chrome(layout, accent, ink, paper)
        + cover_chrome(template_id, accent, ink, paper)
        + back_chrome(template_id, accent, ink, paper)
        + chapter_hero_css(accent)
    )
