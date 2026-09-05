"""Render edited HTML into a searchable ePDF using Edge/Chrome headless."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

CHROME_CANDIDATES = [
    os.environ.get("EPDF_CHROME"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    shutil.which("msedge"),
    shutil.which("chrome"),
    shutil.which("google-chrome"),
    shutil.which("google-chrome-stable"),
    shutil.which("chromium"),
    shutil.which("chromium-browser"),
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
]


def find_browser() -> str:
    for path in CHROME_CANDIDATES:
        if path and Path(path).exists():
            return path
    raise RuntimeError(
        "Chrome or Microsoft Edge not found. Install Edge/Chrome to publish PDFs."
    )


PRINT_CSS = """
@page { size: A4; margin: 12mm; }
html, body { margin: 0; }
.epdf-selected { outline: none !important; box-shadow: none !important; }
"""


def html_to_pdf(html: str, output_path: str | Path, page_format: str = "A4") -> Path:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    browser = find_browser()
    if "data-epdf-print" not in html:
        html = html.replace("</head>", f"<style data-epdf-print='1'>{PRINT_CSS}</style></head>", 1)

    with tempfile.TemporaryDirectory(prefix="epdf_") as tmp:
        html_path = Path(tmp) / "document.html"
        html_path.write_text(html, encoding="utf-8")
        pdf_tmp = Path(tmp) / "out.pdf"
        url = html_path.resolve().as_uri()

        cmd = [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--allow-file-access-from-files",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_tmp}",
        ]
        if page_format.upper() == "LETTER":
            cmd.append("--print-to-pdf-no-header")
        cmd.append(url)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if not pdf_tmp.exists() or pdf_tmp.stat().st_size < 100:
            # Older Chrome/Edge flag
            cmd = [
                browser,
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--allow-file-access-from-files",
                f"--print-to-pdf={pdf_tmp}",
                url,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if not pdf_tmp.exists() or pdf_tmp.stat().st_size < 100:
            err = (result.stderr or result.stdout or "unknown error").strip()
            raise RuntimeError(f"PDF export failed: {err}")

        shutil.copyfile(pdf_tmp, output_path)
    return output_path
