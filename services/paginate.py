"""Turn a dumped Word/PDF stream into a book: title page, then one topic per page."""

from __future__ import annotations

import re

from bs4 import BeautifulSoup, NavigableString, Tag

MAJOR = re.compile(
    r"^(preface|foreword|disclaimer|acknowledgements?|contents|"
    r"table of contents|introduction|dedication|"
    r"copyright|publication(\s+and\s+copyright)?|"
    r"about(\s+the\s+author)?|prologue|epilogue|"
    r"appendix(\s+[a-z0-9]+)?|glossary|index|abstract|"
    r"executive summary|"
    r"chapter\s+(?:\d+|[ivxlcdm]+)|"
    r"part\s+(?:\d+|[ivxlcdm]+)|"
    r"unit\s+\d+|schedule\s+[a-z0-9]+|"
    r"प्रस्तावना|आमुख|अस्वीकरण|विषय-?सूची|अध्याय\s*\d*)\b",
    re.I,
)

AUTHOR_HINT = re.compile(
    r"associates|chartered|advocate|llp|&|authors?|edited by|^by\s",
    re.I,
)
ADDRESS_HINT = re.compile(
    r"\||gurgaon|gurugram|delhi|mumbai|bengaluru|bangalore|chennai|hyderabad|"
    r"kolkata|pune|noida|pin\s|india|\d{5,6}|street|road|marg|nagar",
    re.I,
)

PAGE_CHARS = 3800
SKIP_REFLOW = ("book-page", "demo-banner", "title-page")
PAGE_SECTION = re.compile(r"<section\b[^>]*>", re.I)


def count_pages(html: str) -> int:
    """Count real book pages. Do not use str.count('epdf-page') — footers also match."""
    n = 0
    for tag in PAGE_SECTION.findall(html or ""):
        if re.search(r"\bepdf-page\b", tag) and "epdf-page-footer" not in tag:
            n += 1
    return n


def reflow_book(html: str, title: str = "") -> str:
    if not html or any(mark in html for mark in SKIP_REFLOW):
        return html
    soup = BeautifulSoup(html, "html.parser")
    nodes = _flatten(soup)
    if not nodes:
        return html
    for node in nodes:
        _promote_heading(node)
    front, rest = _split_front(nodes)
    pages: list[list[Tag]] = []
    if front:
        pages.append(_decorate_title(front))
    current: list[Tag] = []
    weight = 0
    for node in rest:
        cost = _cost(node)
        start_topic = _is_major(node) and _has_heading(current)
        overflow = (not _is_major(node)) and current and (weight + cost > PAGE_CHARS)
        if current and (start_topic or overflow):
            pages.append(current)
            current = []
            weight = 0
        current.append(node)
        weight += cost
    if current:
        pages.append(current)
    if not pages:
        return html
    running = title or _guess_title(front) or "ePDF"
    out = []
    chapter_num = 0
    last_i = len(pages)
    for i, chunk in enumerate(pages, start=1):
        classes = ["epdf-page"]
        attrs = [f"data-page='{i}'"]
        if i == 1 and front:
            classes.extend(["title-page", "cover-page"])
            attrs.append("data-page-label='Cover'")
        elif i == last_i and last_i > 1:
            classes.append("back-page")
            attrs.append("data-page-label='Back'")
        elif _page_starts_with_heading(chunk):
            chapter_num += 1
            classes.append("chapter-page")
            attrs.append(f"data-chapter-num='{chapter_num:02d}'")
            attrs.append("data-page-label='Chapter'")
        else:
            attrs.append("data-page-label='Inside'")
        hero = ""
        if "chapter-page" in classes and "back-page" not in classes:
            hero = (
                f'<div class="chapter-hero-banner">'
                f"<span>Chapter {chapter_num}</span></div>"
            )
        inner = hero + "".join(str(n) for n in chunk)
        cls = " ".join(classes)
        out.append(
            f"<section class='{cls}' {' '.join(attrs)}>{inner}"
            f"<div class='epdf-page-footer'><span class='epdf-doc-title'>{_esc(running)}</span>"
            f"<span class='epdf-page-num'>{i}</span></div></section>"
        )
    return "".join(out)


def _page_starts_with_heading(chunk: list[Tag]) -> bool:
    for node in chunk:
        if node.name in {"h1", "h2"}:
            return True
        if node.name == "p" and _is_major(node):
            return True
    return False


def _first_heading_text(chunk: list[Tag]) -> str:
    for node in chunk:
        if node.name in {"h1", "h2", "h3"}:
            text = _text(node)
            if text:
                return text
        if node.name == "p":
            text = _text(node)
            if text and _is_major(node):
                return text
    return ""


def _flatten(soup: BeautifulSoup) -> list[Tag]:
    pages = soup.find_all("section", class_="epdf-page")
    roots = pages if pages else [soup.body or soup]
    nodes: list[Tag] = []
    for root in roots:
        for child in list(root.children):
            if isinstance(child, NavigableString):
                if str(child).strip():
                    p = soup.new_tag("p")
                    p.string = str(child).strip()
                    nodes.append(p)
                continue
            if not getattr(child, "name", None):
                continue
            classes = child.get("class") or []
            if isinstance(classes, str):
                classes = classes.split()
            if child.name == "div" and "epdf-page-footer" in classes:
                continue
            if child.name in {"html", "body", "head"}:
                continue
            nodes.append(child.extract() if child.parent else child)
    return nodes


def _promote_heading(node: Tag) -> None:
    if node.name != "p":
        return
    text = _text(node)
    if not text or len(text) > 90:
        return
    strong = node.find(["strong", "b"])
    bold_only = bool(strong and _text(strong) == text)
    if bold_only and (_is_major_text(text) or text.isupper()):
        node.name = "h2"


def _split_front(nodes: list[Tag]) -> tuple[list[Tag], list[Tag]]:
    front: list[Tag] = []
    parked: list[Tag] = []
    for i, node in enumerate(nodes):
        if _is_major(node):
            return front, parked + nodes[i:]
        text = _text(node)
        if node.name == "table" or len(text) > 140:
            parked.append(node)
            continue
        if parked and not (ADDRESS_HINT.search(text) or AUTHOR_HINT.search(text)):
            parked.append(node)
            continue
        front.append(node)
    if not front:
        return nodes[:1], nodes[1:]
    return front, parked


def _decorate_title(nodes: list[Tag]) -> list[Tag]:
    out = []
    used_subtitle = False
    for i, node in enumerate(nodes):
        text = _text(node)
        cls = []
        if i == 0:
            if node.name not in {"h1", "h2"}:
                node.name = "h1"
            cls.append("doc-title")
        elif ADDRESS_HINT.search(text) and len(text) < 120:
            cls.append("doc-address")
        elif AUTHOR_HINT.search(text) and len(text) < 100:
            cls.append("doc-author")
        elif not used_subtitle and len(text) < 160 and i <= 2:
            cls.append("doc-subtitle")
            used_subtitle = True
        else:
            cls.append("doc-meta")
        _add_class(node, " ".join(cls))
        out.append(node)
    return out


def _has_heading(chunk: list[Tag]) -> bool:
    return any(n.name in {"h1", "h2", "h3"} for n in chunk)


def _is_major(node: Tag) -> bool:
    if node.name not in {"h1", "h2", "h3"}:
        return False
    return _is_major_text(_text(node))


def _is_major_text(text: str) -> bool:
    clean = re.sub(r"\s+", " ", (text or "")).strip()
    clean = re.sub(r"^[\d.]+\s+", "", clean)
    return bool(MAJOR.match(clean))


def _cost(node: Tag) -> int:
    n = len(_text(node))
    if node.name == "table":
        return min(2400, n + 500)
    if node.name == "figure":
        return 900
    return n + 70


def _text(node: Tag) -> str:
    return node.get_text(" ", strip=True) if node else ""


def _add_class(node: Tag, extra: str) -> None:
    classes = node.get("class") or []
    if isinstance(classes, str):
        classes = classes.split()
    for bit in extra.split():
        if bit not in classes:
            classes.append(bit)
    node["class"] = " ".join(classes)


def _guess_title(nodes: list[Tag]) -> str:
    for node in nodes:
        text = _text(node)
        if text:
            return text[:80]
    return ""


def _esc(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
