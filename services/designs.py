"""Per-template shells + CSS that restyle real PDF/Word h1, p, tables — not preview-only classes."""

from __future__ import annotations

FONTS = {
    "libre": '@import url("https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;600;700&display=swap");',
    "playfair": '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@400;600;900&display=swap");',
    "inter": '@import url("https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;1,400&display=swap");',
    "cormorant": '@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400&family=Karla:wght@400;700&display=swap");',
    "garamond": '@import url("https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,700;1,400&family=Source+Sans+3:wght@400;600&display=swap");',
    "outfit": '@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap");',
    "merri": '@import url("https://fonts.googleapis.com/css2?family=Merriweather:wght@700&family=Lato:wght@400;700&display=swap");',
    "fraunces": '@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Nunito:wght@400;700&display=swap");',
    "fredoka": '@import url("https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;700&display=swap");',
    "plex": '@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&display=swap");',
    "vibes": '@import url("https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cormorant+Garamond:wght@500;600&display=swap");',
    "oldstd": '@import url("https://fonts.googleapis.com/css2?family=Old+Standard+TT:wght@400;700&family=Source+Serif+4:wght@400;600&display=swap");',
    "cinzel": '@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Raleway:wght@400;600&display=swap");',
    "lora": '@import url("https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;1,400&family=Karla:wght@400;700&display=swap");',
    "quick": '@import url("https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&family=Nunito:wght@400;700&display=swap");',
    "tiro": '@import url("https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:wght@400;700&family=Noto+Sans:wght@400;700&display=swap");',
    "figtree": '@import url("https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&display=swap");',
    "archivo": '@import url("https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;600;700&display=swap");',
    "source": '@import url("https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Source+Sans+3:wght@400;600;700&display=swap");',
    "legrand": '@import url("https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap");',
}


def _shell(tid: str, extra: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>{{{{title}}}}</title></head>
<body class="tpl tpl-{tid}">
{extra}
<div class="ebook-shell">
  <p class="theme-running">{{{{title}}}}</p>
  <main data-epdf-slot="content"></main>
</div>
</body></html>
"""


def _page(bg, paper, pad="48px 52px 36px", shadow="0 18px 50px rgba(15,23,42,.12)", extra=""):
    return f"""
.ebook-shell{{max-width:820px;margin:0 auto;padding:28px 16px 64px}}
.theme-running{{font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.55;margin:0 8px 14px}}
.epdf-page{{
  background:{paper};
  padding:{pad};
  margin:0 auto 32px;
  min-height:900px;
  box-shadow:{shadow};
  position:relative;
  overflow:visible;
  {extra}
}}
.title-page{{
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  text-align:center;min-height:820px;gap:4px
}}
.title-page .doc-title{{font-size:34px;line-height:1.22;margin:0 0 16px;max-width:16em}}
.title-page .doc-subtitle{{font-size:17px;font-weight:400;opacity:.84;margin:0 0 10px;max-width:28em;line-height:1.45}}
.title-page .doc-author{{font-size:18px;margin:32px 0 4px}}
.title-page .doc-address,.title-page .doc-meta{{font-size:14px;opacity:.68;margin:4px 0;max-width:26em}}
.title-page p{{margin:6px 0;text-indent:0}}
.book-kicker,.chapter-label{{font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.72;margin:0 0 10px}}
.book-subtitle{{font-size:1.12em;line-height:1.45;opacity:.88;margin:0 0 10px}}
.book-byline{{font-size:13px;opacity:.6;margin:0 0 22px}}
.book-author{{font-size:15px;margin:8px 0 0;letter-spacing:.08em}}
.chapter-hero{{margin-bottom:8px}}
.chapter-num{{font-size:56px;font-weight:700;line-height:.85;opacity:.22;margin:0 0 8px}}
.workbook-box{{border:1px solid currentColor;opacity:.55;min-height:72px;margin:10px 0 18px;padding:12px 14px;font-size:14px;line-height:1.55}}
.demo-banner{{font-size:12px;letter-spacing:.04em;opacity:.7;margin:0 0 16px;padding:8px 10px;border:1px dashed currentColor}}
.cal-grid{{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:12px 0 22px;font-size:11px;text-align:center}}
.cal-grid span{{border:1px solid currentColor;padding:8px 2px;opacity:.65}}
blockquote,.epigraph,.pullquote{{margin:20px 0;padding:8px 0 8px 16px;border-left:3px solid currentColor;font-style:italic;font-size:1.15em}}
h4{{font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin:16px 0 8px}}
h5{{font-size:13px;margin:12px 0 6px;opacity:.8}}
a{{color:inherit}}
.toc-list{{list-style:none;padding:0;margin:22px 0 8px}}
.toc-list li{{display:flex;justify-content:space-between;gap:16px;border-bottom:1px dotted currentColor;padding:8px 0;opacity:.82}}
.caption{{font-size:13px;font-style:italic;opacity:.7}}
.pull-quote,.callout{{font-size:1.25em;line-height:1.4;margin:22px 0;padding:12px 18px;border-left:4px solid currentColor}}
p{{margin:0 0 12px;line-height:1.7}}
h3{{margin:18px 0 8px}}
ul,ol{{margin:0 0 14px;padding-left:22px}}
.epdf-figure img{{max-width:100%;border-radius:2px}}
.epdf-page-footer{{display:flex;justify-content:space-between;margin-top:36px;padding-top:12px;font-size:11px;letter-spacing:.08em}}
@media print{{
  body{{background:#fff}}
  .epdf-page{{box-shadow:none;margin:0;min-height:auto;page-break-after:always}}
}}
"""


T = {}

T["cream-handbook"] = (
    _shell("cream-handbook", ""),
    FONTS["libre"]
    + f"""
html,body{{margin:0;background:#e8e0d4}}
.tpl-cream-handbook{{font-family:"Source Sans 3",sans-serif;color:#2b241c;font-size:16px}}
.theme-running{{color:#b45309}}
{_page("#e8e0d4", "#fffaf2", "56px 64px 40px", "0 8px 0 #d6c7b0, 0 22px 40px rgba(80,50,20,.12)")}
.cover-page,.title-page,.back-page{{border:1px solid #ead9b4}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title,.cover-page h1.display-title{{
  font-family:"Libre Baskerville",Georgia,serif;font-size:40px;font-weight:400;line-height:1.2;
  margin:12px 0 18px;border-bottom:1px solid #ead9b4;padding-bottom:16px
}}
h1{{font-family:"Libre Baskerville",serif;font-size:28px;font-weight:700;margin:0 0 14px;color:#7c4a12}}
h2{{font-family:"Libre Baskerville",serif;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#b45309;margin:28px 0 10px;border-top:1px solid #e8d9b8;padding-top:14px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:16px 0 22px}}
.epdf-table th{{background:#f6e7c3;text-align:left;padding:10px 12px;font-size:13px}}
.epdf-table td{{border-bottom:1px solid #ead9b4;padding:10px 12px;vertical-align:top}}
.epdf-table td:first-child{{font-weight:700;color:#7c4a12;width:30%}}
.epdf-page-footer{{border-top:1px solid #ead9b4;color:#8a7354}}
""",
)

T["corporate-navy"] = (
    _shell("corporate-navy", ""),
    FONTS["source"]
    + f"""
html,body{{margin:0;background:#e8eef6}}
.navy-bar{{height:14px;background:#12305a}}
.tpl-corporate-navy{{font-family:"Source Sans 3",sans-serif;color:#0f172a;font-size:16px}}
.theme-running{{color:#1e3a8a}}
{_page("#e8eef6", "#fff", "0 48px 40px", "0 16px 40px rgba(15,35,80,.14)")}
.cover-page::before,.title-page::before{{content:"";display:block;height:8px;background:#e11d48;margin:0 -48px 36px}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:Impact,"Arial Black",sans-serif;font-size:46px;line-height:.95;text-transform:uppercase;letter-spacing:-.03em;color:#12305a;margin:8px 0 16px;padding-top:12px}}
h1{{font-size:28px;color:#12305a;margin:0 0 12px;font-weight:800}}
h2{{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#e11d48;margin:26px 0 10px}}
h2::before{{content:"";display:inline-block;width:18px;height:8px;background:#e11d48;margin-right:8px;vertical-align:middle}}
.epdf-table{{width:100%;border-collapse:collapse;margin:16px 0}}
.epdf-table th{{background:#12305a;color:#fff;padding:11px 12px;text-align:left}}
.epdf-table td{{padding:11px 12px;border-bottom:1px solid #e2e8f0}}
.epdf-table tr:nth-child(even) td{{background:#f1f5f9}}
.epdf-page-footer{{border-top:none;color:#1e3a8a;opacity:.55}}
.tpl-corporate-navy .title-page{{align-items:flex-start;text-align:left}}
""",
)

T["magazine-bold"] = (
    _shell("magazine-bold", ""),
    FONTS["playfair"]
    + f"""
html,body{{margin:0;background:#111}}
.mag-bleed{{height:28px;background:#f5c518}}
.tpl-magazine-bold{{font-family:Inter,sans-serif;color:#111;font-size:16.5px}}
.theme-running{{color:#f5c518}}
{_page("#111", "#fff7ed", "40px 40px 40px", "none")}
.cover-page,.title-page{{border-top:16px solid #f5c518}}
.back-page{{border-bottom:16px solid #f5c518}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:"Playfair Display",serif;font-size:52px;line-height:.95;margin:12px 0 12px}}
h1{{font-family:"Playfair Display",serif;font-size:34px;margin:0 0 12px}}
.chapter-page > h2:first-child{{display:block;background:none;color:#111;font-size:1.4em;letter-spacing:normal;text-transform:none;padding:0;margin:0 0 28px;text-align:center}}
h2{{font-size:14px;letter-spacing:.04em;color:#111;margin:22px 0 10px;font-weight:700}}
.epdf-table{{width:100%;border-collapse:collapse;margin:18px 0}}
.epdf-table th{{background:#111;color:#f5c518;padding:10px}}
.epdf-table td{{border-bottom:3px solid #f5c518;padding:10px}}
.epdf-page-footer{{border-top:none;color:#111;opacity:.55}}
.tpl-magazine-bold .title-page{{align-items:flex-start;text-align:left}}
""",
)

T["minimal-snow"] = (
    _shell("minimal-snow", ""),
    FONTS["inter"]
    + f"""
html,body{{margin:0;background:#f4f4f5}}
.leaf{{position:fixed;color:#86efac;font-size:36px;z-index:2}}
.leaf.tl{{top:20px;left:24px}}.leaf.br{{bottom:20px;right:24px;transform:rotate(180deg)}}
.tpl-minimal-snow{{font-family:Inter,sans-serif;color:#171717;font-size:16px}}
{_page("#f4f4f5", "#fff", "80px 72px 56px", "none")}
.epdf-page{{max-width:620px}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-weight:400;font-style:italic;font-size:42px;text-align:center;margin:28px 0 20px}}
h1{{font-weight:500;font-size:26px;text-align:center;margin:0 0 16px}}
h2{{font-weight:400;text-align:center;font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:#737373;margin:32px 0 12px}}
p{{text-align:center;max-width:36em;margin-left:auto;margin-right:auto}}
.epdf-table{{width:100%;border-collapse:collapse;margin:20px 0}}
.epdf-table th,.epdf-table td{{border:0;border-bottom:1px solid #e5e5e5;padding:10px;text-align:center}}
.epdf-page-footer{{border:0;color:#a3a3a3;justify-content:center;gap:24px}}
""",
)

T["night-gold"] = (
    _shell("night-gold", ""),
    FONTS["cormorant"]
    + f"""
html,body{{margin:0;background:#070706}}
.rings{{position:fixed;right:-50px;top:60px;width:240px;height:240px;border:10px solid #eab308;border-radius:50%;box-shadow:0 0 0 20px #070706,0 0 0 30px #eab308;opacity:.45;pointer-events:none}}
.tpl-night-gold{{font-family:Karla,sans-serif;color:#f5e6c8;font-size:16px}}
.theme-running{{color:#eab308}}
{_page("#070706", "#16140f", "48px 52px 36px", "0 0 0 1px #3f3a24")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:"Cormorant Garamond",serif;font-size:48px;text-transform:uppercase;letter-spacing:.06em;color:#fde68a;margin:16px 0 18px;max-width:80%}}
h1{{font-family:"Cormorant Garamond",serif;font-size:32px;color:#fde68a;margin:0 0 14px}}
h2{{color:#eab308;letter-spacing:.14em;text-transform:uppercase;font-size:12px;margin:26px 0 10px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:16px 0}}
.epdf-table th{{background:#eab308;color:#14120c;padding:10px;text-align:left}}
.epdf-table td{{border:1px solid #5c4b1f;padding:10px}}
.epdf-page-footer{{border-top:1px solid #5c4b1f;color:#eab308}}
""",
)

T["academic-serif"] = (
    _shell("academic-serif", ""),
    FONTS["garamond"]
    + f"""
html,body{{margin:0;background:#ddd6c8}}
.tpl-academic-serif{{font-family:"EB Garamond",Georgia,serif;font-size:17.5px;color:#1c1917}}
{_page("#ddd6c8", "#f7f4ec", "44px 56px 36px", "0 10px 28px rgba(60,40,20,.15)")}
.theme-running{{text-align:center;letter-spacing:.28em}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{text-align:center;font-size:30px;border-top:2px solid #111;border-bottom:1px solid #111;padding:14px 0;margin:12px 0 22px}}
h1{{font-size:24px;margin:0 0 12px;text-align:center}}
h2{{font-size:16px;font-style:italic;margin:22px 0 10px}}
p{{text-align:justify;text-indent:1.4em}}
.cover-page .lede,.cover-page p:first-of-type{{text-indent:0}}
.epdf-table{{width:100%;border-collapse:collapse;font-size:14px;margin:16px 0}}
.epdf-table th,.epdf-table td{{border:1px solid #8a8172;padding:7px 9px}}
.epdf-table th{{background:#efeae0}}
.epdf-page-footer{{border-top:1px solid #111;font-variant:small-caps}}
""",
)

T["startup-sky"] = (
    _shell("startup-sky", ""),
    FONTS["outfit"]
    + f"""
html,body{{margin:0;background:#dbeafe}}
.sky-head{{height:8px;background:#0b1f3a}}
.tpl-startup-sky{{font-family:Outfit,sans-serif;color:#0c4a6e;font-size:16px}}
{_page("#dbeafe", "#f8fbff", "40px 44px 36px", "0 20px 40px rgba(12,74,110,.12)", "border-radius:20px")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-size:42px;font-weight:800;letter-spacing:-.03em;margin:8px 0 14px}}
h1{{font-size:28px;font-weight:800;margin:0 0 12px}}
.chapter-page > h2:first-child{{background:none;color:#0c4a6e;display:block;padding:0;border-radius:0;font-size:1.4em;letter-spacing:normal;text-transform:none;margin:0 0 28px;text-align:center}}
h2{{font-size:14px;font-weight:700;color:#0c4a6e;margin:22px 0 10px}}
.epdf-table{{width:100%;border-collapse:separate;border-spacing:0 8px;margin:12px 0}}
.epdf-table th{{text-align:left;color:#0284c7;padding:0 12px 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}}
.epdf-table td{{background:#fff;padding:12px;border:0}}
.epdf-table tr td:first-child{{border-radius:12px 0 0 12px;font-weight:700}}
.epdf-table tr td:last-child{{border-radius:0 12px 12px 0}}
.epdf-page-footer{{border:0;color:#0284c7}}
.tpl-startup-sky .title-page{{align-items:flex-start;text-align:left}}
""",
)

T["legal-brief"] = (
    _shell("legal-brief", ""),
    f"""
html,body{{margin:0;background:#f3f0ea}}
.tpl-legal-brief{{font-family:"Times New Roman",Times,serif;color:#111;font-size:15.5px}}
{_page("#f3f0ea", "#fff", "36px 44px", "none")}
.cover-page,.title-page,.back-page{{border:7px double #7f1d1d}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{text-align:center;text-transform:uppercase;letter-spacing:.08em;font-size:22px;margin:24px 0 16px}}
h1{{text-align:center;text-transform:uppercase;font-size:20px;margin:0 0 14px}}
h2{{font-size:15px;text-transform:uppercase;margin:20px 0 8px;border-bottom:1px solid #111;padding-bottom:4px}}
p{{text-align:justify}}
.epdf-table{{width:100%;border-collapse:collapse;margin:14px 0}}
.epdf-table th,.epdf-table td{{border:1px solid #111;padding:8px}}
.epdf-table th{{background:#fef2f2}}
.epdf-page-footer{{border-top:1px solid #111}}
""",
)

T["annual-navy"] = (
    _shell("annual-navy", ""),
    FONTS["merri"]
    + f"""
html,body{{margin:0;background:#0b1f3a}}
.report-hero{{height:160px;background:linear-gradient(to top,#0b1f3a,transparent 50%),radial-gradient(circle at 50% 80%,#f97316,#7c2d12 42%,#0f172a 72%);color:#fff;display:flex;align-items:flex-end;padding:16px 8%;font-family:Merriweather,serif;font-size:22px;letter-spacing:.16em}}
.tpl-annual-navy{{font-family:Lato,sans-serif;color:#0b1f3a;font-size:16px}}
.theme-running{{display:none}}
{_page("#0b1f3a", "#fff", "40px 48px 36px", "none")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:Merriweather,serif;font-size:32px;margin:0 0 14px}}
h1{{font-family:Merriweather,serif;font-size:26px;margin:0 0 12px}}
h2{{color:#0f766e;font-size:14px;letter-spacing:.1em;text-transform:uppercase;margin:22px 0 10px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:14px 0}}
.epdf-table th{{background:#0f766e;color:#fff;padding:11px;text-align:left}}
.epdf-table td{{padding:11px;border-bottom:1px solid #ccfbf1}}
.epdf-table tr:nth-child(even) td{{background:#f0fdfa}}
.epdf-page-footer{{border-top:none;color:#0f766e;opacity:.55}}
""",
)

T["cookbook-rust"] = (
    _shell("cookbook-rust", ""),
    FONTS["fraunces"]
    + f"""
html,body{{margin:0;background:#ffedd5}}
.cook-band{{background:#c2410c;color:#fff7ed;font-family:Fraunces,serif;font-size:26px;padding:18px 8%;letter-spacing:.02em}}
.tpl-cookbook-rust{{font-family:Nunito,sans-serif;color:#431407;font-size:16.5px}}
.theme-running{{display:none}}
{_page("#ffedd5", "#fff7ed", "36px 44px", "0 12px 0 #fdba74")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:Fraunces,serif;font-size:36px;color:#c2410c;margin:8px 0 12px}}
h1{{font-family:Fraunces,serif;font-size:28px;color:#c2410c;margin:0 0 10px}}
h2{{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9a3412;margin:20px 0 8px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:14px 0 18px}}
.epdf-table th{{background:#c2410c;color:#fff;padding:10px;text-align:left}}
.epdf-table td{{border:1px solid #fdba74;padding:10px;background:#fff}}
.epdf-table td:first-child{{font-weight:700;width:34%}}
.epdf-page-footer{{border-top:none;color:#c2410c;opacity:.55}}
""",
)

T["storybook"] = (
    _shell("storybook", ""),
    FONTS["fredoka"]
    + f"""
html,body{{margin:0;background:#fbcfe8}}
.story-sky{{height:64px;background:linear-gradient(#f472b6,#fbcfe8)}}
.tpl-storybook{{font-family:Nunito,sans-serif;color:#4a044e;font-size:18px}}
{_page("#fbcfe8", "#fff1f2", "36px 40px", "0 16px 0 #f9a8d4", "border-radius:28px")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:Fredoka,sans-serif;font-size:34px;color:#db2777;text-align:center;margin:8px 0 16px}}
h1{{font-family:Fredoka,sans-serif;font-size:26px;color:#db2777;text-align:center}}
h2{{text-align:center;color:#9d174d;font-size:16px}}
.epdf-table{{width:100%;border-collapse:separate;border-spacing:8px;background:transparent}}
.epdf-table th,.epdf-table td{{background:#fff;border-radius:14px;border:0;padding:12px;box-shadow:0 5px 0 #f9a8d4}}
.epdf-page-footer{{border:0;color:#db2777;justify-content:center;gap:20px}}
""",
)

T["tech-slate"] = (
    _shell("tech-slate", ""),
    FONTS["plex"]
    + f"""
html,body{{margin:0;background:#020617}}
.tpl-tech-slate{{font-family:"IBM Plex Sans",sans-serif;color:#e2e8f0;font-size:15.5px}}
.theme-running{{color:#67e8f9;font-family:ui-monospace,Consolas,monospace}}
{_page("#020617", "#0f172a", "40px 44px", "0 0 0 1px #164e63")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-size:30px;color:#67e8f9;margin:8px 0 14px}}
h1{{font-size:24px;color:#67e8f9;margin:0 0 12px}}
h2{{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#22d3ee;margin:22px 0 10px;font-weight:600;background:none;padding:0;display:block;font-family:"IBM Plex Sans",sans-serif}}
.epdf-table{{width:100%;border-collapse:collapse;font-family:ui-monospace,Consolas,monospace;font-size:13px;margin:14px 0}}
.epdf-table th{{background:#164e63;color:#67e8f9;text-align:left;padding:9px}}
.epdf-table td{{border-bottom:1px solid #334155;padding:9px}}
.epdf-page-footer{{border-top:1px solid #334155;color:#67e8f9;font-family:ui-monospace,Consolas,monospace}}
.tpl-tech-slate .title-page{{align-items:flex-start;text-align:left}}
""",
)

T["blush-invite"] = (
    _shell("blush-invite", ""),
    FONTS["vibes"]
    + f"""
html,body{{margin:0;background:#fce7f3}}
.invite-top{{background:#0f766e;color:#fff;text-align:center;letter-spacing:.42em;text-transform:uppercase;font-size:11px;padding:14px}}
.tpl-blush-invite{{font-family:"Cormorant Garamond",serif;color:#4c0519;font-size:18px}}
{_page("#fce7f3", "#fff1f2", "40px 48px", "0 0 0 1px #fbcfe8")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:"Great Vibes",cursive;font-size:56px;font-weight:400;color:#be185d;text-align:center;margin:16px 0}}
h1{{font-family:"Great Vibes",cursive;font-size:40px;text-align:center;color:#be185d;font-weight:400}}
h2{{text-align:center;font-size:16px;letter-spacing:.12em;text-transform:uppercase}}
p{{text-align:center}}
.epdf-table{{width:86%;margin:16px auto;border-collapse:collapse;text-align:left}}
.epdf-table th,.epdf-table td{{border:0;border-bottom:1px solid #fbcfe8;padding:10px}}
.epdf-page-footer{{border-top:1px solid #fbcfe8;color:#be185d;justify-content:center;gap:24px}}
""",
)

T["newsprint"] = (
    _shell("newsprint", ""),
    FONTS["oldstd"]
    + f"""
html,body{{margin:0;background:#c4b59a}}
.tpl-newsprint{{font-family:"Source Serif 4",Georgia,serif;color:#111;font-size:16px}}
{_page("#c4b59a", "#efe8d8", "28px 32px 24px", "none")}
.theme-running{{text-align:center;letter-spacing:.22em;border-bottom:1px solid #111;padding-bottom:6px}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:"Old Standard TT",serif;font-size:38px;text-align:center;border-top:4px solid #111;border-bottom:1px solid #111;padding:8px 0;margin:8px 0 16px}}
h1{{font-family:"Old Standard TT",serif;font-size:28px;text-align:center;margin:0 0 12px}}
h2{{font-size:14px;text-transform:uppercase;letter-spacing:.08em;margin:16px 0 8px}}
.epdf-table{{width:100%;border-collapse:collapse;font-size:13.5px;margin:12px 0}}
.epdf-table th,.epdf-table td{{border:1px solid #111;padding:7px}}
.epdf-table th{{background:#111;color:#efe8d8}}
.epdf-page-footer{{border-top:none;opacity:.55}}
""",
)

T["obsidian-luxe"] = (
    _shell("obsidian-luxe", ""),
    FONTS["cinzel"]
    + f"""
html,body{{margin:0;background:#020617}}
.tpl-obsidian-luxe{{font-family:Raleway,sans-serif;color:#e0f2fe;font-size:16px}}
.theme-running{{color:#38bdf8;letter-spacing:.28em;text-align:center}}
{_page("#020617", "transparent", "56px 48px", "none")}
.epdf-page{{background:#07101f;border:1px solid #1e3a8a33}}
.cover-page,.title-page,.back-page{{background:radial-gradient(circle at 20% 0,#1e3a8a 0,transparent 42%),#07101f;border:1px solid #1e3a8a}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:Cinzel,serif;letter-spacing:.22em;font-size:28px;text-align:center;color:#fff;margin:36px 0 18px}}
h1{{font-family:Cinzel,serif;letter-spacing:.12em;font-size:22px;text-align:center;color:#fff}}
h2{{letter-spacing:.16em;text-transform:uppercase;font-size:12px;color:#38bdf8;text-align:center}}
.epdf-table{{width:100%;border-collapse:collapse;margin:18px 0}}
.epdf-table th,.epdf-table td{{border-color:#1e3a8a;padding:10px;color:#fde68a}}
.epdf-table th{{letter-spacing:.12em;font-size:11px;text-align:left}}
.epdf-page-footer{{border-top:1px solid #1e3a8a;color:#38bdf8}}
""",
)

T["forest-journal"] = (
    _shell("forest-journal", ""),
    FONTS["lora"]
    + f"""
html,body{{margin:0;background:#d1fae5}}
.wash{{height:100px;background:radial-gradient(circle at 30% 70%,#34d399 0 16%,transparent 17%),radial-gradient(circle at 70% 40%,#6ee7b7 0 20%,transparent 21%),#d1fae5}}
.tpl-forest-journal{{font-family:Karla,sans-serif;color:#14532d;font-size:16.5px}}
{_page("#d1fae5", "#f0fdf4", "40px 48px", "0 14px 30px rgba(20,83,45,.12)")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:Lora,serif;font-style:italic;font-size:36px;margin:8px 0 14px}}
h1{{font-family:Lora,serif;font-style:italic;font-size:28px;margin:0 0 12px}}
h2{{color:#166534;font-size:14px;letter-spacing:.08em;text-transform:uppercase;border-left:4px solid #166534;padding-left:10px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:14px 0}}
.epdf-table th{{background:#166534;color:#fff;padding:10px;text-align:left}}
.epdf-table td{{border-bottom:1px dashed #86efac;padding:10px}}
.epdf-page-footer{{border-top:1px dashed #166534;color:#166534}}
""",
)

T["lilac-soft"] = (
    _shell("lilac-soft", ""),
    FONTS["quick"]
    + f"""
html,body{{margin:0;background:#f3e8ff}}
.duo{{height:72px;display:flex;overflow:hidden}}
.duo i:first-child{{flex:1;background:#fb923c;transform:skewX(-10deg)}}
.duo i:last-child{{flex:1;background:#38bdf8;transform:skewX(-10deg)}}
.tpl-lilac-soft{{font-family:Nunito,sans-serif;color:#3b0764;font-size:16.5px}}
{_page("#f3e8ff", "#faf5ff", "36px 44px", "0 12px 28px rgba(88,28,135,.12)", "border-radius:18px")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:Quicksand,sans-serif;font-size:32px;margin:8px 0 12px}}
h1{{font-family:Quicksand,sans-serif;font-size:26px;margin:0 0 12px}}
h2{{color:#7e22ce;font-size:15px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:14px 0}}
.epdf-table th{{background:#7e22ce;color:#fff;padding:10px}}
.epdf-table td{{border:2px solid #e9d5ff;min-height:34px;padding:10px;background:#fff}}
.epdf-page-footer{{border-top:none;color:#7e22ce;opacity:.55}}
""",
)

T["royal-maroon"] = (
    _shell("royal-maroon", ""),
    FONTS["tiro"]
    + f"""
html,body{{margin:0;background:#7f1d1d}}
.tpl-royal-maroon{{font-family:"Noto Sans",sans-serif;color:#450a0a;font-size:16px}}
.theme-running{{color:#fcd34d;text-align:center}}
{_page("#7f1d1d", "#fffbeb", "40px 44px", "none")}
.cover-page,.title-page,.back-page{{border:10px solid #9f1239;outline:5px solid #fcd34d;outline-offset:6px}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:"Tiro Devanagari Hindi",Georgia,serif;font-size:34px;text-align:center;color:#9f1239;margin:12px 0 16px}}
h1{{font-family:"Tiro Devanagari Hindi",Georgia,serif;font-size:26px;text-align:center;color:#9f1239}}
h2{{text-align:center;color:#b45309;font-size:15px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:14px 0}}
.epdf-table th{{background:#9f1239;color:#fde68a;padding:10px}}
.epdf-table td{{border:1px solid #fcd34d;padding:10px}}
.epdf-page-footer{{border-top:none;color:#9f1239;opacity:.55}}
""",
)

T["clinic-teal"] = (
    _shell("clinic-teal", ""),
    FONTS["figtree"]
    + f"""
html,body{{margin:0;background:#ccfbf1}}
.t-mark{{width:52px;height:52px;border:2px solid #0f766e;border-radius:50%;margin:24px auto 0;text-align:center;line-height:48px;font-family:Georgia,serif;color:#0f766e;font-size:28px}}
.tpl-clinic-teal{{font-family:Figtree,sans-serif;color:#134e4a;font-size:16.5px}}
{_page("#ccfbf1", "#fff", "40px 48px", "0 16px 36px rgba(15,118,110,.12)")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:Georgia,serif;font-weight:400;font-size:36px;text-align:center;margin:8px 0 16px}}
h1{{font-family:Georgia,serif;font-weight:400;font-size:28px;margin:0 0 12px}}
h2{{color:#0f766e;font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin:22px 0 10px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:14px 0}}
.epdf-table th{{text-align:left;color:#0f766e;border-bottom:2px solid #0f766e;padding:10px}}
.epdf-table td{{border-bottom:1px solid #ccfbf1;padding:12px 10px}}
.epdf-page-footer{{border-top:1px solid #99f6e4;color:#0f766e}}
""",
)

T["studio-red"] = (
    _shell("studio-red", ""),
    FONTS["archivo"]
    + f"""
html,body{{margin:0;background:#111}}
.studio-hero{{height:140px;background:linear-gradient(#fecdd3,#e11d48);display:flex;align-items:flex-end;justify-content:center;gap:10px;padding-bottom:14px}}
.studio-hero b{{width:32px;background:#fff;box-shadow:3px 3px 0 #9f1239}}
.studio-hero b:nth-child(1){{height:32px}} .studio-hero b:nth-child(2){{height:48px}} .studio-hero b:nth-child(3){{height:64px}}
.tpl-studio-red{{font-family:Archivo,sans-serif;color:#0a0a0a;font-size:16px}}
.theme-running{{color:#e11d48;letter-spacing:.2em}}
{_page("#111", "#fff", "36px 44px", "none")}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title{{font-family:"Archivo Black",sans-serif;font-size:34px;margin:8px 0 14px}}
h1{{font-family:"Archivo Black",sans-serif;font-size:26px;margin:0 0 12px}}
h2{{color:#e11d48;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:22px 0 10px}}
.epdf-table{{width:100%;border-collapse:collapse;margin:14px 0}}
.epdf-table th{{background:#e11d48;color:#fff;letter-spacing:.1em;font-size:12px;padding:10px;text-align:left}}
.epdf-table td{{border-bottom:3px solid #111;padding:10px}}
.epdf-page-footer{{border-top:none;color:#e11d48;opacity:.55}}
""",
)

T["legrand-research"] = (
    _shell("legrand-research", ""),
    FONTS["legrand"]
    + f"""
html,body{{margin:0;background:#e4e4e4}}
.legrand-band{{height:5px;background:linear-gradient(90deg,#34b1c9 0%,#2a9aad 55%,#1e7a8a 100%)}}
.tpl-legrand-research{{font-family:"PT Serif",Georgia,"Times New Roman",serif;color:#1a1a1a;font-size:16.5px;line-height:1.72}}
.theme-running{{color:#34b1c9;font-family:Jost,sans-serif;letter-spacing:.2em}}
{_page("#e4e4e4", "#fff", "0 0 40px", "0 12px 36px rgba(26,26,26,.14)")}
.cover-page,.title-page{{border-top:4px solid #34b1c9;padding-top:0}}
.epdf-page:not(.cover-page):not(.title-page):not(.back-page){{border-top:2px solid #34b1c933;padding-top:0}}
.chapter-page .chapter-hero-banner{{
  aspect-ratio:auto;min-height:36px;width:100%;margin:0 0 18px;
  background:linear-gradient(90deg,#0f2d3a 0%,#34b1c9 100%);
  display:flex;align-items:center;padding:10px 24px;box-sizing:border-box
}}
.chapter-page .chapter-hero-banner span{{
  font-family:Jost,sans-serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#fff;opacity:.9
}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title,.cover-page h1.book-title{{
  font-family:Jost,sans-serif;font-size:36px;font-weight:700;line-height:1.18;color:#1a1a1a;margin:24px 0 12px
}}
.cover-page .book-subtitle,.title-page .doc-subtitle{{
  font-family:Jost,sans-serif;font-size:18px;font-weight:500;color:#34b1c9;margin:0 0 8px
}}
.cover-page .book-author,.title-page .doc-author{{
  font-family:Jost,sans-serif;font-size:22px;font-weight:600;margin:28px 0 6px;letter-spacing:.02em
}}
.cover-page .book-kicker,.title-page .book-kicker{{
  font-family:Jost,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#34b1c9;margin:20px 0 0
}}
h1,.book-page h1{{
  font-family:Jost,sans-serif;font-size:26px;font-weight:700;color:#1a1a1a;margin:0 0 14px;
  padding-bottom:10px;border-bottom:2px solid #34b1c9
}}
h2{{
  font-family:Jost,sans-serif;font-size:15px;font-weight:600;color:#34b1c9;margin:28px 0 10px;
  letter-spacing:.06em;text-transform:uppercase
}}
h2::before{{content:"§ ";opacity:.7;font-weight:700}}
h3{{font-family:Jost,sans-serif;font-size:14px;font-weight:600;color:#2a2a2a;margin:20px 0 8px}}
.chapter-num{{font-family:Jost,sans-serif;font-size:72px;font-weight:700;line-height:.85;color:#34b1c9;opacity:.18;margin:0 0 -8px}}
.chapter-label{{font-family:Jost,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#34b1c9;margin:0 0 8px}}
p{{text-align:justify;text-indent:0;margin:0 0 12px}}
.lede{{font-size:1.05em;line-height:1.75}}
blockquote,.pull-quote,.remark{{
  margin:18px 24px;padding:14px 18px;border-left:4px solid #34b1c9;
  background:#f0f9fb;font-style:italic;color:#1a4a55
}}
.remark strong{{font-family:Jost,sans-serif;font-style:normal;color:#34b1c9;font-size:12px;letter-spacing:.08em;text-transform:uppercase}}
.epdf-table{{width:100%;border-collapse:collapse;margin:18px 0;font-size:14.5px}}
.epdf-table thead{{border-top:2px solid #1a1a1a;border-bottom:1px solid #1a1a1a}}
.epdf-table th{{background:#f0f9fb;color:#1a1a1a;padding:10px 12px;text-align:left;font-family:Jost,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase}}
.epdf-table td{{border-bottom:1px solid #d8d8d8;padding:10px 12px;vertical-align:top}}
.epdf-table tr:last-child td{{border-bottom:2px solid #1a1a1a}}
.epdf-page-footer{{
  border-top:1px solid #34b1c9;color:#34b1c9;font-family:Jost,sans-serif;font-size:11px;letter-spacing:.1em;margin:0 52px;padding-top:12px
}}
.cover-page{{padding:48px 52px 40px;text-align:center}}
.cover-page p{{text-align:center}}
.toc-list li{{border-bottom-color:#34b1c9;opacity:.9}}
.caption{{font-size:13px;font-style:italic;color:#666;text-align:center;margin-top:8px}}
@media print{{
  .chapter-hero-banner{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
}}
""",
)

T["column-gazette"] = (
    _shell("column-gazette", ""),
    FONTS["source"]
    + f"""
html,body{{margin:0;background:#f1f5f9}}
.tpl-column-gazette{{font-family:"Source Sans 3",system-ui,sans-serif;color:#0f172a;font-size:15.5px;line-height:1.7}}
.theme-running{{color:#64748b;letter-spacing:.14em;font-weight:600}}
{_page("#f1f5f9", "#fff", "48px 48px 36px", "0 20px 48px rgba(15,23,42,.08)", "border-radius:4px")}
.ebook-shell{{max-width:920px}}
.epdf-page{{border:0}}
.cover-page,.title-page{{
  column-count:1 !important;display:flex;flex-direction:column;justify-content:center;text-align:left
}}
.epdf-page:not(.cover-page):not(.title-page):not(.back-page){{
  column-count:2;column-gap:40px;column-rule:none;column-fill:balance
}}
.cover-page .display-title,.cover-page .book-title,.title-page .doc-title,.cover-page h1.book-title{{
  font-family:"Source Serif 4",Georgia,serif;font-size:38px;font-weight:600;line-height:1.15;
  margin:10px 0 16px;letter-spacing:-.02em;color:#0f172a
}}
.cover-page .book-subtitle,.title-page .doc-subtitle{{
  font-size:17px;color:#64748b;max-width:24em;font-weight:400
}}
.cover-page .book-kicker{{
  font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#0ea5e9;font-weight:700
}}
h1,.book-page h1{{
  font-family:"Source Serif 4",Georgia,serif;font-size:22px;font-weight:600;line-height:1.28;
  margin:0 0 14px;column-span:all;break-after:avoid;letter-spacing:-.015em;color:#0f172a
}}
h2{{
  font-size:13px;font-weight:700;color:#0ea5e9;letter-spacing:.06em;text-transform:uppercase;
  margin:18px 0 8px;break-after:avoid
}}
h3{{font-size:15px;font-weight:650;margin:14px 0 6px;break-after:avoid;color:#1e293b}}
p{{margin:0 0 12px;text-align:left;hyphens:none}}
.lede{{font-size:1.06em;column-span:all;margin-bottom:18px;color:#334155}}
blockquote,.pull-quote{{
  margin:14px 0;padding:4px 0 4px 16px;border-left:2px solid #0ea5e9;font-style:italic;
  color:#475569;break-inside:avoid;background:none
}}
.epdf-table,.epdf-figure,ul,ol,.cal-grid,.workbook-box{{
  column-span:all;break-inside:avoid
}}
ul,ol{{padding-left:1.15em}}
.epdf-table{{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}}
.epdf-table th{{background:#f8fafc;text-align:left;padding:10px 12px;font-size:12px;font-weight:700;color:#64748b;letter-spacing:.04em;text-transform:uppercase;border-bottom:1px solid #e2e8f0}}
.epdf-table td{{border-bottom:1px solid #f1f5f9;padding:10px 12px;vertical-align:top}}
.epdf-page-footer{{
  column-span:all;border-top:1px solid #e2e8f0;margin-top:28px;padding-top:12px;
  font-size:11px;letter-spacing:.08em;color:#94a3b8;text-transform:none
}}
.toc-list{{column-span:all}}
.toc-list li{{border-bottom:1px solid #f1f5f9}}
.caption{{font-size:12px;font-style:normal;color:#94a3b8;column-span:all}}
@media print{{
  .epdf-page:not(.cover-page):not(.title-page):not(.back-page){{column-count:2;column-gap:36px;column-rule:none}}
}}
""",
)


def get_design(template_id: str) -> tuple[str, str] | None:
    base = T.get(template_id)
    if not base:
        return None
    html, css = base
    from services.page_designs import augment_css

    return html, augment_css(template_id, css)
