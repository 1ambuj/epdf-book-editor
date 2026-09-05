"""Simple manuscript wrapper for the Write-content step (no book template yet)."""

from __future__ import annotations

MANUSCRIPT_CSS = """
html, body {
  margin: 0;
  background: #fff;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
  color: #1a2332;
  line-height: 1.72;
  font-size: 16px;
}
body {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 48px 96px;
}
h1 {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
  line-height: 1.2;
}
h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 28px 0 10px;
}
h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 8px;
}
p { margin: 0 0 14px; }
ul, ol { margin: 0 0 14px; padding-left: 1.4em; }
table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
}
th, td {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}
img { max-width: 100%; height: auto; }
blockquote {
  margin: 16px 0;
  padding-left: 16px;
  border-left: 3px solid #cbd5e1;
  color: #475569;
}
"""


def wrap_manuscript(content: str, title: str = "Document") -> str:
    """Wrap extracted HTML fragment in a clean single-column manuscript page."""
    inner = (content or "").strip()
    if not inner:
        inner = "<h1>Untitled</h1><p>Start writing here.</p>"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{_esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style data-manuscript="1">{MANUSCRIPT_CSS}</style>
</head>
<body>{inner}</body>
</html>"""


def _esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
