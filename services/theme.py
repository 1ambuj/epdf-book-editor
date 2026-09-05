"""Turn a Designrr / exported HTML+CSS book into a theme that restyles our pages."""

from __future__ import annotations

import re
from urllib.parse import quote

GENERIC_FONTS = {
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "inherit",
    "initial",
    "georgia",
    "times",
    "times new roman",
    "arial",
    "helvetica",
    "verdana",
    "tahoma",
    "courier",
    "courier new",
}

KEEP_PROPS = {
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "color",
    "text-align",
    "line-height",
    "letter-spacing",
    "text-transform",
    "background-color",
    "background-image",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin-top",
    "margin-bottom",
}

VARIANT_BLOCK = re.compile(
    r"/\*start_styles_for_\.variant\.(_[a-z0-9_]+)\*/(.*?)/\*end_styles_for_",
    re.I | re.S,
)
DECL = re.compile(r"([a-zA-Z-]+)\s*:\s*([^;}{]+)")
URL = re.compile(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", re.I)
PAGE_SIZE = re.compile(r'data-page-size=["\'](\d+)\s*[x×]\s*(\d+)["\']', re.I)


def looks_like_exported_book(html: str) -> bool:
    if not html:
        return False
    if "data-epdf-slot" in html:
        return False
    blob = html.lower()
    pages = blob.count("page-container") + blob.count("cover-page-container")
    wraps = blob.count('id="contentwrap"') + blob.count("id='contentwrap'")
    return (
        pages >= 2
        or wraps >= 2
        or "designrr" in blob
        or "data-template-id" in blob
        or "inlineScript-loaded" in html
    )


def looks_like_theme_css(css: str) -> bool:
    if not css:
        return False
    lower = css.lower()
    return (
        "#contentwrap" in lower
        or ".page-container" in lower
        or ".variant._h1_" in lower
        or "designrr" in lower
    )


def compile_theme(html: str, css: str) -> str:
    """Keep the uploaded CSS look, remap it onto .epdf-page, drop dummy Designrr pages."""
    raw = _all_css(html, css)
    width, height = _page_size(html)
    variants = _variant_map(raw)
    title_decls = _pick_heading(variants.get("h1") or [], prefer="title")
    h1_decls = _pick_heading(variants.get("h1") or [], prefer="body")
    h2_decls = _first_useful(variants.get("h2") or variants.get("h3") or [])
    h3_decls = _first_useful(variants.get("h3") or variants.get("h4") or [])
    p_decls = _first_useful(variants.get("p") or [])
    body_font = _decl_value(raw, r"\bhtml\b", "font-family") or _decl_value(raw, r"\bbody\b", "font-family")
    families = _fonts_from(
        body_font,
        title_decls.get("font-family"),
        h1_decls.get("font-family"),
        h2_decls.get("font-family"),
        p_decls.get("font-family"),
    )
    font_urls = re.findall(
        r"@import url\([\"']?(https://fonts\.googleapis\.com[^\"')]+)[\"']?\)",
        raw,
        re.I,
    )
    built = _font_import(families)
    extra = re.search(r"url\([\"']?(https://fonts\.googleapis\.com[^\"')]+)", built or "")
    if extra and extra.group(1) not in font_urls:
        font_urls.append(extra.group(1))
    links = "".join(f'<link rel="stylesheet" href="{url}">' for url in font_urls)
    themed = _sanitize_css(_remap_selectors(raw))
    themed = re.sub(r"@import[^;]+;", "", themed)
    overlay = f"""
.ebook-shell {{ max-width: {width}px; margin: 0 auto; padding: 24px 12px 64px; }}
.epdf-page {{
  width: 100%;
  min-height: {height}px;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  box-sizing: border-box;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 28px;
}}
.epdf-page.title-page {{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}}
.epdf-page.title-page .doc-title, .epdf-page.title-page h1 {{ {_css_from_decls(title_decls) or "font-size: 42px; text-align: center;"} }}
.epdf-page:not(.title-page) h1 {{ {_css_from_decls(h1_decls) or "font-size: 28px;"} }}
.epdf-page h2 {{ {_css_from_decls(h2_decls) or "font-size: 20px;"} }}
.epdf-page h3 {{ {_css_from_decls(h3_decls) or "font-size: 16px;"} }}
.epdf-page p {{ {_css_from_decls(p_decls)} }}
.epdf-table {{ width: 100%; border-collapse: collapse; margin: 16px 0 22px; }}
.epdf-table th, .epdf-table td {{ border-bottom: 1px solid rgba(0,0,0,.12); padding: 10px 12px; vertical-align: top; text-align: left; }}
.epdf-figure img {{ max-width: 100%; height: auto; background: none !important; }}
.epdf-page-footer {{ display: flex; justify-content: space-between; margin-top: 28px; padding-top: 10px; font-size: 12px; }}
#inlineScript-loaded {{ display: none !important; }}
"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{{{title}}}}</title>
  {links}
  <style data-epdf-template-css="1">{themed}\n{overlay}</style>
</head>
<body class="tpl tpl-custom">
  <div class="ebook-shell">
    <main data-epdf-slot="content"></main>
  </div>
</body>
</html>
"""


def _remap_selectors(css: str) -> str:
    pairs = (
        (r"\.cover-page-container\b", ".epdf-page.title-page.cover-page"),
        (r"\.back-page-container\b", ".epdf-page.back-page"),
        (r"\.toc-container\b", ".epdf-page"),
        (r"\.chapter-heading-container\b", ".epdf-page"),
        (r"\.page-container\b", ".epdf-page"),
        (r"#contentwrap\b", ".epdf-page"),
        (r"#headerwrap\b", ".epdf-running-header"),
        (r"#footerwrap\b", ".epdf-page-footer"),
        (r"(?<![-\w])\.content\b", ".epdf-page"),
        (r"\.single-column\b", "body"),
        (r"\.two-column\b", "body"),
    )
    for pat, rep in pairs:
        css = re.sub(pat, rep, css)
    return css


def _sanitize_css(css: str) -> str:
    def drop_star(match: re.Match) -> str:
        return "" if re.search(r"background", match.group(0), re.I) else match.group(0)

    css = re.sub(r"\*\s*\{[^{}]*\}", drop_star, css)
    css = re.sub(r"\b(?:max-height|min-height)\s*:\s*[\d.]+px(?:\s*!important)?\s*;?", "", css, flags=re.I)
    css = re.sub(r"\boverflow\s*:\s*hidden(?:\s*!important)?\s*;?", "overflow: visible;", css, flags=re.I)
    return css


def _all_css(html: str, css: str) -> str:
    parts = [css or ""]
    parts.extend(re.findall(r"<style[^>]*>(.*?)</style>", html or "", re.I | re.S))
    return "\n".join(parts)


def _page_size(html: str) -> tuple[int, int]:
    m = PAGE_SIZE.search(html or "")
    if m:
        return max(480, int(m.group(1))), max(640, int(m.group(2)))
    return 794, 1123


def _cover_image(css: str) -> str:
    for hint in ("cover-page-container", "back-page-container", "#cover-page-content"):
        idx = css.find(hint)
        if idx < 0:
            continue
        m = URL.search(css[idx : idx + 1200])
        if m and m.group(1).strip() not in {"none", ""}:
            return m.group(1).strip()
    return ""


def _decl_value(css: str, selector: str, prop: str) -> str:
    found = ""
    for m in re.finditer(selector + r"[^{]*\{([^}]+)\}", css, re.I):
        decls = _parse_decls(m.group(1))
        if prop in decls:
            found = decls[prop]
    return found


def _parse_decls(body: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for prop, val in DECL.findall(body or ""):
        prop = prop.lower().strip()
        val = re.sub(r"\s+", " ", val).strip()
        if prop not in KEEP_PROPS:
            continue
        if _useless(val):
            continue
        out[prop] = val
    return out


def _useless(val: str) -> bool:
    v = val.lower().strip()
    return v in {
        "none",
        "initial",
        "0",
        "0px",
        "rgba(0, 0, 0, 0)",
        "rgba(0,0,0,0)",
        "transparent",
        "normal",
    } or v.startswith("0px none") or v.startswith("none solid")


def _variant_map(css: str) -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = {}
    for name, body in VARIANT_BLOCK.findall(css or ""):
        tag = _variant_tag(name)
        if not tag:
            continue
        decls = _parse_decls(body)
        if not decls:
            continue
        grouped.setdefault(tag, []).append(decls)
    return grouped


def _variant_tag(name: str) -> str:
    m = re.match(r"_(h[1-6]|p)_", name, re.I)
    return m.group(1).lower() if m else ""


def _font_px(decls: dict[str, str]) -> float:
    m = re.search(r"([\d.]+)\s*px", decls.get("font-size") or "")
    return float(m.group(1)) if m else 0


def _pick_heading(items: list[dict[str, str]], prefer: str) -> dict[str, str]:
    if not items:
        return {}
    scored = [( _font_px(d), d) for d in items]
    scored.sort(key=lambda x: x[0], reverse=True)
    if prefer == "title":
        return scored[0][1]
    bodyish = [d for size, d in scored if 18 <= size <= 42]
    if bodyish:
        return bodyish[0]
    if scored:
        big = scored[0][1].copy()
        size = _font_px(big)
        if size > 48:
            big["font-size"] = "28px"
            if "line-height" in big:
                big["line-height"] = "1.25"
            big["text-align"] = "left"
        return big
    return items[0]


def _first_useful(items: list[dict[str, str]]) -> dict[str, str]:
    for item in items:
        if item.get("font-family") or item.get("font-size") or item.get("color"):
            return item
    return items[0] if items else {}


def _css_from_decls(decls: dict[str, str]) -> str:
    if not decls:
        return ""
    skip_bg = {"background-image", "background-color"}
    parts = [f"{k}: {v}" for k, v in decls.items() if k not in skip_bg]
    return ("; ".join(parts) + ";") if parts else ""


def _fonts_from(*families: str) -> list[str]:
    found: list[str] = []
    for chunk in families:
        if not chunk:
            continue
        for part in chunk.split(","):
            name = part.strip().strip("'\"").strip()
            if not name or name.lower() in GENERIC_FONTS:
                continue
            if name not in found:
                found.append(name)
    return found[:6]


def _font_import(families: list[str]) -> str:
    if not families:
        return ""
    parts = ["family=" + quote(name).replace("%20", "+") + ":ital,wght@0,300;0,400;0,500;0,700;1,400" for name in families]
    return '@import url("https://fonts.googleapis.com/css2?' + "&".join(parts) + '&display=swap");\n'
