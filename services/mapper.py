"""Map extracted PDF HTML into an uploaded HTML/CSS template."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

from bs4 import BeautifulSoup

from services.paginate import reflow_book
from services.theme import compile_theme, looks_like_exported_book, looks_like_theme_css


SLOT_ATTRS = ("data-epdf-slot", "data-slot", "data-content")
SLOT_IDS = ("content", "main", "body-content", "ebook-content", "epdf-content")
SLOT_CLASSES = ("content", "main", "body-content", "ebook-content", "epdf-content", "page-content")


def load_template(template_html: str | None, template_css: str | None, extra_files: dict[str, bytes] | None = None) -> str:
    css_parts: list[str] = []
    if template_css:
        css_parts.append(template_css)
    if extra_files:
        for name, data in extra_files.items():
            if name.lower().endswith(".css"):
                css_parts.append(data.decode("utf-8", errors="replace"))
    css = "\n".join(css_parts)
    raw_html = template_html or ""
    if looks_like_exported_book(raw_html) or (looks_like_theme_css(css) and "data-epdf-slot" not in raw_html):
        return compile_theme(raw_html, css)
    html = raw_html or _default_shell()
    if css:
        html = _inject_css(html, css)
    return html


def read_template_uploads(files: list) -> tuple[str | None, str | None, dict[str, bytes]]:
    """files: list of (filename, bytes)."""
    html = None
    css = None
    extra: dict[str, bytes] = {}

    for name, data in files:
        lower = name.lower()
        if lower.endswith(".zip"):
            zhtml, zcss, zextra = _read_zip(data)
            html = html or zhtml
            css = css or zcss
            extra.update(zextra)
        elif lower.endswith((".html", ".htm")):
            html = data.decode("utf-8", errors="replace")
        elif lower.endswith(".css"):
            css = data.decode("utf-8", errors="replace")
        else:
            extra[Path(name).name] = data
    return html, css, extra


def apply_template(template_html: str, extracted_html: str, title: str, media_base: str) -> str:
    content = extracted_html.replace("__MEDIA__", media_base.rstrip("/"))
    soup = BeautifulSoup(template_html, "html.parser")

    if not soup.head:
        head = soup.new_tag("head")
        soup.html.insert(0, head) if soup.html else soup.insert(0, head)

    if not soup.find("meta", attrs={"charset": True}):
        meta = soup.new_tag("meta", charset="utf-8")
        soup.head.insert(0, meta)

    if soup.title:
        soup.title.string = title
    else:
        t = soup.new_tag("title")
        t.string = title
        soup.head.append(t)

    _ensure_editor_css(soup)
    _ensure_font_links(soup)

    slot = _find_slot(soup)
    content = dress_content(content, title)
    content_soup = BeautifulSoup(content, "html.parser")
    pages = content_soup.find_all("section", class_="epdf-page") or list(content_soup.contents)

    if slot is not None:
        slot.clear()
        for child in pages:
            if getattr(child, "name", None):
                slot.append(child)
    else:
        body = soup.body or soup
        wrapper = soup.new_tag("main")
        wrapper["data-epdf-slot"] = "content"
        for child in pages:
            if getattr(child, "name", None):
                wrapper.append(child)
        body.append(wrapper)

    html = str(soup)
    html = html.replace("{{title}}", title)
    html = html.replace("{{content}}", "")
    return html


def dress_content(html: str, title: str = "") -> str:
    """Strip Word inline styles and reflow into title page + one topic per page."""
    html = reflow_book(html or "", title)
    soup = BeautifulSoup(html or "", "html.parser")
    for tag in soup.find_all(True):
        if tag.has_attr("style"):
            del tag["style"]
        if tag.has_attr("face") or tag.has_attr("size") or tag.has_attr("color"):
            for attr in ("face", "size", "color"):
                if tag.has_attr(attr):
                    del tag[attr]
        if tag.name == "font":
            tag.unwrap()
    _strip_empty_headings(soup)
    return str(soup)


def _strip_empty_headings(soup: BeautifulSoup) -> None:
    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        text = (h.get_text() or "").strip()
        if text:
            continue
        if h.find(["img", "table", "svg"]):
            continue
        h.decompose()


def _usable_slot(node) -> bool:
    if not node or not getattr(node, "name", None):
        return False
    nid = (node.get("id") or "").lower()
    classes = " ".join(node.get("class") or []).lower()
    if nid in {"contentwrap", "headerwrap", "footerwrap", "inlinescript-loaded", "titlewrap", "authorwrap"}:
        return False
    if any(mark in classes for mark in ("page-container", "cover-page-container", "toc-container", "chapter-heading")):
        return False
    return True


def _find_slot(soup: BeautifulSoup):
    for attr in SLOT_ATTRS:
        node = soup.find(attrs={attr: True})
        if _usable_slot(node):
            return node
    for sid in SLOT_IDS:
        node = soup.find(id=sid)
        if _usable_slot(node):
            return node
    for cls in SLOT_CLASSES:
        for node in soup.find_all(class_=cls):
            if _usable_slot(node):
                return node
    for text in soup.find_all(string=re.compile(r"\{\{\s*content\s*\}\}")):
        if _usable_slot(text.parent):
            return text.parent
    main = soup.find("main")
    if _usable_slot(main):
        return main
    return soup.body


def _inject_css(html: str, css: str) -> str:
    from bs4 import BeautifulSoup as Soup

    soup = Soup(html, "html.parser")
    if not soup.head:
        head = soup.new_tag("head")
        if soup.html:
            soup.html.insert(0, head)
        else:
            soup.insert(0, head)
    style = soup.new_tag("style")
    style["data-epdf-template-css"] = "1"
    style.string = css
    soup.head.append(style)
    return str(soup)


def _ensure_editor_css(soup: BeautifulSoup) -> None:
    if soup.find("style", attrs={"data-epdf-runtime": "1"}):
        return
    style = soup.new_tag("style")
    style["data-epdf-runtime"] = "1"
    style.string = RUNTIME_CSS
    soup.head.append(style)


def _ensure_font_links(soup: BeautifulSoup) -> None:
    if not soup.head:
        return
    seen = {link.get("href") for link in soup.find_all("link", rel="stylesheet")}
    blob = " ".join(str(s.string or "") for s in soup.find_all("style"))
    for url in re.findall(r"@import url\([\"']?(https://fonts\.googleapis\.com[^\"')]+)[\"']?\)", blob, re.I):
        if url in seen:
            continue
        link = soup.new_tag("link", rel="stylesheet", href=url)
        soup.head.insert(0, link)
        seen.add(url)


def _read_zip(data: bytes) -> tuple[str | None, str | None, dict[str, bytes]]:
    html = None
    css = None
    extra: dict[str, bytes] = {}
    with zipfile.ZipFile(io_bytes(data)) as zf:
        names = zf.namelist()
        html_name = next((n for n in names if n.lower().endswith((".html", ".htm")) and "__macosx" not in n.lower()), None)
        css_name = next((n for n in names if n.lower().endswith(".css") and "__macosx" not in n.lower()), None)
        if html_name:
            html = zf.read(html_name).decode("utf-8", errors="replace")
        if css_name:
            css = zf.read(css_name).decode("utf-8", errors="replace")
        for name in names:
            if name.endswith("/") or name == html_name or name == css_name:
                continue
            extra[Path(name).name] = zf.read(name)
    return html, css, extra


def io_bytes(data: bytes):
    import io

    return io.BytesIO(data)


def _default_shell() -> str:
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ePDF</title>
</head>
<body>
  <main data-epdf-slot="content"></main>
</body>
</html>
"""


RUNTIME_CSS = """
:root {
  --page-pad-x: 56px;
  --page-pad-y: 72px;
  --col-gap: 24px;
}
.epdf-page {
  position: relative;
  page-break-after: always;
  break-after: page;
  overflow: visible;
  box-sizing: border-box;
  padding: var(--page-pad-y) var(--page-pad-x) calc(var(--page-pad-y) * 0.7);
}
.epdf-page p { margin: 0 0 14px; line-height: 1.72; }
.epdf-page h2 { margin: 28px 0 12px; }
.epdf-page h2:first-child, .epdf-page h1:first-child { margin-top: 0; }
.epdf-page:last-child { page-break-after: auto; break-after: auto; }
.epdf-figure { margin: 12px 0; max-width: 100%; box-sizing: border-box; }
.epdf-figure img { max-width: 100%; height: auto; display: block; }
.epdf-figure.epdf-free-pos {
  position: absolute !important;
  margin: 0 !important;
  z-index: 6;
  max-width: none;
}
.epdf-figure.epdf-free-pos img { width: 100%; max-width: none; height: auto; display: block; }
.epdf-page-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: auto;
  padding-top: 20px;
  font-size: 12px;
}
p, h1, h2, h3, h4, h5, td, th, li { cursor: text; }
body.tpl:not(.tpl-custom) .epdf-page:not(.title-page) h1,
body.tpl:not(.tpl-custom) .epdf-page:not(.title-page) h2,
body.tpl:not(.tpl-custom) .epdf-page:not(.title-page) h3 {
  display: block !important;
  background: none !important;
  background-color: transparent !important;
  padding: 0 !important;
  border-radius: 0;
  max-width: none;
}
body.tpl:not(.tpl-custom) .epdf-page:not(.title-page) h1 {
  font-size: 28px !important;
  line-height: 1.25;
  letter-spacing: 0;
  text-transform: none !important;
}
body.tpl:not(.tpl-custom) .epdf-page:not(.title-page) h2 {
  font-size: 20px !important;
  line-height: 1.35;
  letter-spacing: 0.02em;
  text-transform: none !important;
}
body.tpl:not(.tpl-custom) .epdf-page:not(.title-page) h3 {
  font-size: 17px !important;
  letter-spacing: 0;
  text-transform: none !important;
}
@media print {
  .epdf-page { min-height: auto; overflow: visible; }
}
.epdf-layout-2col {
  display: grid;
  grid-template-columns: minmax(0, var(--col-left, 1fr)) minmax(0, var(--col-right, 1fr));
  gap: var(--col-gap, 24px);
  width: 100%;
  align-items: start;
  margin: 4px 0 8px;
  position: relative;
}
.epdf-col { min-width: 0; min-height: 140px; }
.epdf-col > p { margin-bottom: 14px; }
.epdf-cols-2 .epdf-col > p,
.epdf-cols-2 .epdf-col > ul,
.epdf-cols-2 .epdf-col > ol {
  text-align: justify;
  hyphens: auto;
  text-align-last: left;
}
.epdf-col > .epdf-col-heading,
.epdf-col > span.epdf-col-heading {
  display: block;
  max-width: 100%;
  box-sizing: border-box;
}
.epdf-cols-2 .epdf-col > h1,
.epdf-cols-2 .epdf-col > h2,
.epdf-cols-2 .epdf-col > h3,
.epdf-cols-2 .epdf-col > h4,
.epdf-cols-2 .epdf-col > h5,
.epdf-cols-2 .epdf-col > h6,
.epdf-cols-2 .epdf-col > .epdf-col-heading {
  text-align: left;
  hyphens: none;
  text-transform: none;
  letter-spacing: 0;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.35;
  margin: 0 0 12px;
  padding: 0;
  border: none;
  background: none;
}
.epdf-cols-2 .epdf-col > h1 { font-size: 1.35em; }
.epdf-cols-2 .epdf-col > h2 { font-size: 1.2em; font-weight: 700; }
.epdf-cols-2 .epdf-col > h3,
.epdf-cols-2 .epdf-col > .epdf-col-heading { font-size: 1.05em; font-weight: 700; }
.epdf-cols-2 .epdf-col > blockquote,
.epdf-cols-2 .epdf-col > .callout,
.epdf-cols-2 .epdf-col > .pull-quote,
.epdf-cols-2 .epdf-col > .epdf-col-note {
  text-align: left;
  hyphens: none;
  font-style: italic;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-left: 3px solid #64748b;
  background: #f8fafc;
  font-size: 0.92em;
  line-height: 1.55;
}
.epdf-span-all { grid-column: 1 / -1; width: 100%; }
.epdf-page.epdf-cols-2 > .epdf-span-all {
  width: 100%;
  max-width: 100%;
}
.epdf-table-full { width: 100%; max-width: 100%; table-layout: fixed; }
.epdf-table-page { display: flex; flex-direction: column; }
"""
