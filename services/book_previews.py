"""Full sample books for template preview — cover through back page, like Designrr."""

from __future__ import annotations

P = (
    "This is sample body text — the same kind of paragraph that will appear when you upload "
    "your Word or PDF. A real chapter is not a heading sitting on a blank sheet. It is several "
    "sentences that run to the margin, then another paragraph, then a list or a table. Read this "
    "page as a finished leaf: fonts, line height, and the space between blocks are the design."
)
P2 = (
    "Keep a second paragraph under the first so the column looks like a book, not a slide. "
    "Short files still get this breathing room after you click Use; long files fill the next pages "
    "the same way. If your source has headings, they become the titles above. If it has tables, "
    "they become the grids you can edit cell by cell."
)
P3 = (
    "A third paragraph stops the page from feeling empty at the bottom. In a handbook this might "
    "be a warning. In a magazine it is the rest of the anecdote. In a report it is the sentence "
    "after the number. Your own words will replace every line you see here."
)
P4 = (
    "When a reader turns the leaf they should already know the voice of the book. That is why "
    "this preview repeats full paragraphs instead of one heading and a gap. Scroll the whole "
    "sample: cover, contents, chapters, tables, planner, and the back page all use the same theme."
)

BOOKS = {
    "cream-handbook": dict(
        title="The Practical Handbook", kicker="Staff training series · Volume 3",
        subtitle="A complete desk guide for teams who run programmes, not just write policy.",
        byline="Written for coordinators · 12 chapters", author="Author Name",
        chapters=["How this book is organised", "Roles and the yearly calendar", "Glossary of terms", "Quarterly checklists"],
        table=("Term", "What people actually mean",
               [("FY", "Financial year — 1 April to 31 March."),
                ("FCRA", "Foreign contribution rules before a grant."),
                ("CSR Rules", "The policy your board signed."),
                ("Schedule VII", "Allowed activities — match your project here.")]),
    ),
    "corporate-navy": dict(
        title="Operating Playbook", kicker="Internal playbook · Confidential",
        subtitle="How this company decides, ships, and reports — in one bound volume.",
        byline="Office of the COO · Edition 2026", author="Author Name",
        chapters=["Who owns which decision", "The weekly operating rhythm", "Hiring above band", "Public statements"],
        table=("Decision", "Owner",
               [("Pricing change", "Head of Sales — monthly review"),
                ("Hiring above band", "CHRO + CFO — offer stage"),
                ("Vendor over ₹5 lakh", "Procurement — before PO"),
                ("Public statement", "Communications — same day")]),
    ),
    "magazine-bold": dict(
        title="The Long Story", kicker="Volume 12 · Feature issue",
        subtitle="Essays, profiles and arguments meant to be read slowly — then argued over dinner.",
        byline="Cover story · 4,200 words", author="Author Name",
        chapters=["The city that learned to wait", "Night schools in three wards", "Gig riders after 11 p.m.", "Rent after the flood"],
        table=("Beat", "What we followed",
               [("Education", "Night schools in three wards"),
                ("Work", "Gig riders after 11 p.m."),
                ("Home", "Rent after the flood")]),
    ),
    "minimal-snow": dict(
        title="Quiet Rooms", kicker="Poems & small prose",
        subtitle="A slim book for the hours when you do not want a plot — only a sentence that sits still.",
        byline="First collection · 64 pages", author="Author Name",
        chapters=["The window facing east", "Letters you did not send", "A kitchen, two chairs", "The last train of the page"],
        table=("Part", "Mood",
               [("Spring", "Letters you did not send"),
                ("Rain", "A kitchen, two chairs"),
                ("Night", "The last train of the page")]),
    ),
    "night-gold": dict(
        title="After Dark", kicker="Private edition",
        subtitle="A gala book: menus, names, and the rooms people dress up to enter.",
        byline="Evening collection · numbered copies", author="Author Name",
        chapters=["Where the night is kept", "The Hall", "The Terrace", "The Library"],
        table=("Room", "Note",
               [("The Hall", "String quartet from nine"),
                ("The Terrace", "Only fifty names"),
                ("The Library", "Whisky and first editions")]),
    ),
    "academic-serif": dict(
        title="Reading the Archive", kicker="Dissertation / textbook",
        subtitle="A sample chapter in the manner of a thesis: abstract, numbered heads, a table of sources.",
        byline="Department of History · Supervisor’s copy", author="Author Name",
        chapters=["Method and limits", "Board minutes 2014–2024", "Field diaries", "Circulars and definitions"],
        table=("Source", "Use",
               [("Board minutes", "Decision trail, 2014–2024"),
                ("Field diaries", "Practice vs rule"),
                ("Circulars", "Definition changes")]),
    ),
    "startup-sky": dict(
        title="Ship It", kicker="Product guide",
        subtitle="The founder’s field manual: onboarding, pricing, and the first ninety days.",
        byline="v3.2 · for operators who hate fluff", author="Author Name",
        chapters=["What you turn on first", "Create workspace", "Connect billing", "First customer call"],
        table=("Step", "Done when",
               [("Create workspace", "Invite link works"),
                ("Connect billing", "Test invoice sent"),
                ("First customer call", "Notes in the doc")]),
    ),
    "legal-brief": dict(
        title="A Bound Brief", kicker="In the matter of",
        subtitle="Caption, facts, and annexures — the volume that belongs in a filing cabinet.",
        byline="For the Hon’ble Court · confidential", author="Author Name",
        chapters=["Statement of facts", "Issues for determination", "Annexure A", "Prayer"],
        table=("Annexure", "Description",
               [("A", "Board resolution dated 12 Jan"),
                ("B", "Email thread, pages 4–11"),
                ("C", "Bank statement, Q3")]),
    ),
    "annual-navy": dict(
        title="Annual Report 2026", kicker="Year in review",
        subtitle="Numbers in tables, then the human paragraph. For yearly volumes the board keeps.",
        byline="Published for members · FY 2025–26", author="Author Name",
        chapters=["Letter from the chair", "Where the money went", "Programmes in the field", "The year ahead"],
        table=("Programme", "Reach",
               [("Education", "12,400 learners"),
                ("Livelihoods", "860 enterprises"),
                ("Health camps", "31 districts")]),
    ),
    "cookbook-rust": dict(
        title="Sunday Pot", kicker="Home cooking",
        subtitle="Ingredients you can measure, a method you can follow, a table that belongs in a kitchen.",
        byline="Family recipes · 40 plates", author="Author Name",
        chapters=["Stock that lasts the week", "The Sunday pot", "Breads", "Sweets for guests"],
        table=("Ingredient", "Amount",
               [("Onions, sliced", "3 large"),
                ("Tomatoes", "4 ripe"),
                ("Whole spices", "1 tbsp"),
                ("Time on the hob", "90 minutes")]),
    ),
    "storybook": dict(
        title="Mina and the Moon Bus", kicker="A read-aloud story",
        subtitle="Short lines, a picture frame, and a cast table for young readers.",
        byline="Picture book · ages 4–8", author="Author Name",
        chapters=["The bus that waited", "Mina packs a pear", "The moon is a stop", "Home before dark"],
        table=("Who", "They always",
               [("Mina", "Keeps a pear in her pocket"),
                ("The conductor", "Rings a silver bell"),
                ("The moon", "Waits one extra minute")]),
    ),
    "tech-slate": dict(
        title="The Internal Docs", kicker="Engineering handbook",
        subtitle="Runbooks, endpoints, and the page on-call actually opens at 2 a.m.",
        byline="Platform team · living document", author="Author Name",
        chapters=["Auth tokens", "Deploy checklist", "Incident severity", "On-call roster"],
        table=("Endpoint", "Owner",
               [("/v1/jobs", "Workflows"),
                ("/v1/media", "Storage"),
                ("/healthz", "SRE")]),
    ),
    "blush-invite": dict(
        title="A & R", kicker="Together",
        subtitle="A ceremony booklet: names, the hour, and a schedule held in the hand.",
        byline="Saturday · the garden pavilion", author="Author Name",
        chapters=["The hour we begin", "Order of service", "Dinner", "The last dance"],
        table=("Time", "What happens",
               [("4:30", "Guests seated"),
                ("5:00", "Vows"),
                ("7:00", "Dinner under the neem")]),
    ),
    "newsprint": dict(
        title="City Desk", kicker="Collected reporting",
        subtitle="Headline, dateline, fact box — a newspaper that became a book.",
        byline="Metro edition · 2019–2026", author="Author Name",
        chapters=["The night the bridge closed", "Ward 14 after rain", "The last printing press", "Letters to the editor"],
        table=("Fact", "On record",
               [("Ward", "14"),
                ("Hours closed", "11"),
                ("Buses diverted", "26")]),
    ),
    "obsidian-luxe": dict(
        title="Obsidian", kicker="Lookbook 01",
        subtitle="Black page, champagne type, a table of looks for the season.",
        byline="Studio line · autumn", author="Author Name",
        chapters=["Silk", "Look 01", "Look 07", "The line sheet"],
        table=("Look", "Fabric",
               [("01", "Silk charmeuse"),
                ("07", "Wool crepe"),
                ("12", "Organza")]),
    ),
    "forest-journal": dict(
        title="Green Months", kicker="A field notebook",
        subtitle="Moss greens and room in the margin for a sketch from the trail.",
        byline="Twelve walks · one year", author="Author Name",
        chapters=["March thaw", "The ridge after rain", "Insects at noon", "First frost"],
        table=("Month", "Note",
               [("March", "Ice leaves the path"),
                ("July", "Cicadas from four"),
                ("November", "First frost on the kettle")]),
    ),
    "lilac-soft": dict(
        title="Twelve Weeks", kicker="A course workbook",
        subtitle="Fill-in tables and kind type for a book people write in, not only read.",
        byline="Cohort 7 · coaching edition", author="Author Name",
        chapters=["Week one check-in", "The habit you keep", "What you will drop", "The letter at week twelve"],
        table=("Week", "Practice",
               [("1", "Write three lines each morning"),
                ("4", "Walk without a phone"),
                ("12", "Send the letter you drafted")]),
    ),
    "royal-maroon": dict(
        title="Utsav Guide", kicker="Family vidhi book",
        subtitle="Maroon and gold for a ceremonial volume kept in the house.",
        byline="Household edition · with dates", author="Author Name",
        chapters=["The morning of the feast", "What to keep ready", "The aarti", "Prasad table"],
        table=("Item", "Ready by",
               [("Flowers", "Sunrise"),
                ("Lamps", "Before guests"),
                ("Prasad", "After aarti")]),
    ),
    "clinic-teal": dict(
        title="Take This Home", kicker="Patient guide",
        subtitle="Calm teal, short sentences, a table a family can read in a hurry.",
        byline="Clinic take-home pack", author="Author Name",
        chapters=["What happens today", "Medicines at home", "When to call", "The next visit"],
        table=("Medicine", "When",
               [("Tablet A", "After breakfast"),
                ("Syrup B", "Night, if fever"),
                ("Call us", "If breathing is hard")]),
    ),
    "studio-red": dict(
        title="Selected Works", kicker="Works on paper",
        subtitle="An artist’s book: statement, a list of pieces, and space where a plate would sit.",
        byline="2019–2026 · studio edition", author="Author Name",
        chapters=["I paint the hour after the shop shuts", "Shutter", "After nine", "Two cups"],
        table=("No.", "Title",
               [("03", "Shutter — 2021"),
                ("04", "After nine — 2023"),
                ("11", "Two cups — 2025")]),
    ),
    "legrand-research": dict(
        title="Clustering the Interstellar Medium", kicker="Research documentation report",
        subtitle="Data mining and machine learning in astronomy — methods, tests, and ideas to continue.",
        byline="Summer research internship · University of Western Ontario", author="Author Name",
        chapters=["Introduction", "Discovering what to do", "Understand your data", "Experimenting"],
        table=("Filter / Config.", "Central λ",
               [("F225W", "235.9 nm — UV wide"),
                ("F657N", "656.7 nm — Hα + [N II]"),
                ("F814W", "802.4 nm — I band")]),
    ),
    "column-gazette": dict(
        title="The Weekly Briefing", kicker="Two-column gazette · Vol. 8",
        subtitle="A newsletter that reads like a newspaper — body text in two columns, headlines across the top.",
        byline="Friday edition · print & screen", author="Author Name",
        chapters=["What changed this week", "The policy in one page", "Field notes", "What to watch next"],
        table=("Beat", "Takeaway",
               [("Policy", "The draft is out for comment."),
                ("Ops", "Three sites went live."),
                ("People", "New editor starts Monday.")]),
    ),
}


def footer(title: str, page: str) -> str:
    return (
        f"<div class='epdf-page-footer'><span class='epdf-doc-title'>{title}</span>"
        f"<span class='epdf-page-num'>Page {page}</span></div>"
    )


def page(n: int, inner: str, running: str, extra_class: str = "") -> str:
    cls = "epdf-page book-page" + ((" " + extra_class) if extra_class else "")
    return f"<section class='{cls}' data-page='{n}'>{inner}{footer(running, str(n))}</section>"


def _table(head_a: str, head_b: str, rows: list[tuple[str, str]]) -> str:
    body = "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in rows)
    return (
        f"<table class='epdf-table'><thead><tr><th>{head_a}</th><th>{head_b}</th></tr></thead>"
        f"<tbody>{body}</tbody></table>"
    )


def _toc(chapters: list[str]) -> str:
    extra = [
        "How to read this book",
        "A note from the author",
        *chapters,
        "Tables and checklists",
        "Weekly planner & notes",
        "About the author",
        "Back matter",
    ]
    items = "".join(
        f"<li><span>{title}</span><span>{str(i * 2 + 3).zfill(2)}</span></li>"
        for i, title in enumerate(extra)
    )
    return f"<ol class='toc-list'>{items}</ol>"


def _cal() -> str:
    cells = "".join(f"<span>{d}</span>" for d in ("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"))
    cells += "".join(f"<span>{i}</span>" for i in range(1, 31))
    return f"<div class='cal-grid'>{cells}</div>"


def _bullets(items: list[str]) -> str:
    return "<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>"


def build_book(book: dict) -> str:
    t = book["title"]
    author = book["author"]
    a, b, rows = book["table"]
    ch = book["chapters"]
    n = 0

    def nxt(inner: str, extra: str = "") -> str:
        nonlocal n
        n += 1
        return page(n, inner, t, extra)

    more_rows = list(rows) + [
        ("Next item", "Replace this cell with a line from your file."),
        ("Another row", "Tables grow when your PDF or Word has more records."),
        ("Last sample", "After Use, click any cell and type."),
    ]

    pages = [
        nxt(
            f"""
<div class="demo-banner">Sample book — your Word or PDF content will flow into headings, paragraphs, and tables like this.</div>
<p class="book-kicker">{book["kicker"]}</p>
<h1 class="book-title">{t}</h1>
<p class="book-subtitle">{book["subtitle"]}</p>
<p class="book-byline">{book["byline"]}</p>
<p class="book-author">{author}</p>
<p class="lede">{P}</p>
<p>{P2}</p>
<h3>What you will find inside</h3>
{_bullets([ch[0], ch[1], ch[2] if len(ch) > 2 else "Checklists you can print", "Tables that stay editable after you publish"])}
<p>{P3}</p>
""",
            "cover-page",
        ),
        nxt(
            f"""
<p class="book-kicker">{book["kicker"]}</p>
<h1 class="book-title">{t}</h1>
<p class="book-subtitle">{book["subtitle"]}</p>
<h2>{author}</h2>
<p class="book-byline">{book["byline"]}</p>
<p>{P}</p>
<p>{P2}</p>
<h3>This edition</h3>
<p>First printing, 2026. The layout you are looking at is the interior of the template — not a poster. Copyright pages in a real book are full of small type. That is why this leaf is packed, not blank.</p>
<p>{P3}</p>
<p>{P4}</p>
<p class="caption">Dedication: for the reader who will replace every sentence with their own.</p>
""",
        ),
        nxt(
            f"""
<p class="chapter-label">This edition</p>
<h2>About this sample book</h2>
<p class="lede">Open this preview the way a buyer opens a printed copy: start at the top, read to the footer, then turn. {t} is only a stand-in title. Your document title will sit in the same place, in this font, with this colour.</p>
<p>{P}</p>
<p>{P2}</p>
<h3>How your file maps onto this page</h3>
{_bullets([
    "Headings in Word/PDF become the titles (H1, H2, H3) you see here.",
    "Normal paragraphs become this running text — same width, same line height.",
    "Tables become the grids on later pages; cells stay clickable in the editor.",
    "Page numbers and the running footer stay on every leaf after you publish.",
])}
<p>{P3}</p>
<p>{P4}</p>
<p class="caption">Footer and page numbers are part of the theme — they will print on your ePDF too.</p>
""",
        ),
        nxt(
            f"""
<p class="chapter-label">Contents</p>
<h2>Table of contents</h2>
<p>A contents page is a full list, not four lonely lines. When your book has chapters, they will line up like this — title on the left, page on the right — in this template’s type.</p>
{_toc(ch)}
<p>{P2}</p>
<p>{P3}</p>
<h3>How to use the preview</h3>
<p>Scroll past this leaf to see a chapter opening, then body pages with several headings, then a data table, a planner, and a back page. That is the full costume of the theme. If those pages look right, click Use.</p>
""",
        ),
        nxt(
            f"""
<div class="chapter-hero-banner"><span>{ch[0]}</span></div>
<p class="chapter-num">01</p>
<p class="chapter-label">Chapter heading page</p>
<h1 class="book-title">{ch[0]}</h1>
<p class="lede">A chapter opener is still a written page. After the big number and the title, the first paragraph tells the reader what this chapter is for — the way your own first paragraph will, once the file is mapped.</p>
<p>{P}</p>
<p>{P2}</p>
<blockquote class="pull-quote">Write the sentence you want the reader to remember. In your book this quote will be yours.</blockquote>
<p>{P3}</p>
""",
            "chapter-page",
        ),
        nxt(
            f"""
<p class="chapter-label">Body text · all heading sizes</p>
<h2>{ch[0]}</h2>
<p class="lede">{P}</p>
<p>{P2}</p>
<h3>A section inside the chapter</h3>
<p>{P3}</p>
{_bullets([
    "First point: your bullet lists will inherit this indent and spacing.",
    "Second point: keep items short enough to scan, long enough to mean something.",
    "Third point: after the list, the next heading should feel like a new breath.",
])}
<h4>A smaller heading</h4>
<p>{P4}</p>
<h5>The smallest heading</h5>
<p>Use this level for labels, captions, or a tight sub-point. Then return to body size so the page does not shout.</p>
<p>{P}</p>
<p><a href="#">A simple hyperlink looks like this</a> — same colour family as the theme, underlined or not as the CSS decides.</p>
""",
        ),
        nxt(
            f"""
<p>{P}</p>
<p>{P2}</p>
<h2>{ch[1] if len(ch) > 1 else "The next section"}</h2>
<p>{P3}</p>
<h3>Keep writing until the column is full</h3>
<p>{P4}</p>
<p>{P}</p>
<h4>A note in the margin of the argument</h4>
<p>{P2}</p>
<h5>Detail</h5>
<p>{P3}</p>
<p>{P4}</p>
<blockquote class="epigraph">“If the page looks empty, the template is not finished — and neither is the sample.”</blockquote>
<p>{P}</p>
""",
        ),
        nxt(
            f"""
<p class="chapter-label">Tables in this theme</p>
<h2>{a} / {b}</h2>
<p>This is how a data table sits on the page in <em>{t}</em>. Header row, striped or ruled cells, first column emphasised — whatever this theme does, your extracted tables will receive. Add rows in the editor if the PDF missed a line.</p>
{_table(a, b, more_rows)}
<p class="caption">Tip: click a cell after you open the editor. Type over the sample. Publish keeps the same grid.</p>
<p>{P2}</p>
<p>{P3}</p>
""",
        ),
        nxt(
            f"""
<h2>Insights after the chapter</h2>
<p>Workbook pages are not empty boxes. They already hold sample notes so you can see handwriting-sized type on this paper colour.</p>
<h3>After reading, I noticed…</h3>
<div class="workbook-box">The first habit I will keep is writing the decision in the table before the meeting starts. The second is closing the week with three lines, not a novel.</div>
<h3>In 6 months from now I want to achieve…</h3>
<div class="workbook-box">Ship a version of this book that a new teammate can follow without asking me on chat. Keep the tables up to date every quarter.</div>
<h3>Checklist</h3>
{_table("Step", "Owner", [
    ("Replace sample title", author),
    ("Paste real table rows", "You"),
    ("Check headers on every chapter", "Editor"),
    ("Publish ePDF and flip on a phone", "You"),
])}
<p>{P4}</p>
""",
        ),
        nxt(
            f"""
<h2>Weekly planner</h2>
<p>Plan and manage a real week. Sample tasks are filled in so the grid does not look like graph paper with nothing on it.</p>
<table class="epdf-table planner">
<thead><tr><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr></thead>
<tbody>
<tr><td>Stand-up</td><td>Write ch. 2</td><td>Review table</td><td>Call printer</td><td>Edit quotes</td><td>Read aloud</td><td>Rest</td></tr>
<tr><td>Notes 09:00</td><td>Draft sidebar</td><td>Fix captions</td><td>Photos in</td><td>Proof pages 1–8</td><td>Family copy</td><td>—</td></tr>
<tr><td>Send file</td><td>Template check</td><td>Publish test</td><td>Share link</td><td>Archive</td><td></td><td></td></tr>
</tbody>
</table>
<h3>Summary — after this week I feel…</h3>
<ol>
  <li>The theme holds a full week of cells without looking cramped.</li>
  <li>Empty days still show a ruled box, so the planner is usable.</li>
  <li>I can delete a sample task and type my own in the same cell.</li>
  <li>Footer still reads {t} — running title stays consistent.</li>
  <li>Next leaf is another chapter, not a blank sheet.</li>
</ol>
<p>{P2}</p>
""",
        ),
        nxt(
            f"""
<p class="chapter-num">02</p>
<p class="chapter-label">Chapter heading page</p>
<h1 class="book-title">{ch[1] if len(ch) > 1 else ch[0]}</h1>
<p class="lede">{P}</p>
<p>{P2}</p>
<p>{P3}</p>
<h3>What this chapter covers</h3>
{_bullets([
    "The argument in one page of running text, not a title on white space.",
    "A table if your source has numbers or names.",
    "A closing paragraph so the leaf feels finished.",
])}
<p>{P4}</p>
""",
            "chapter-hero",
        ),
        nxt(
            f"""
<p class="chapter-num">03</p>
<p class="chapter-label">Chapter heading page</p>
<h1 class="book-title">{ch[2] if len(ch) > 2 else t}</h1>
<p class="lede">{P}</p>
<p>{P2}</p>
<p>{P3}</p>
<p>{P4}</p>
<blockquote class="pull-quote">Chapter three in {t} would continue here — stories, steps, or sources, in this exact type.</blockquote>
<p>{P}</p>
""",
            "chapter-hero",
        ),
        nxt(
            f"""
<h2>To-do list &amp; calendar</h2>
<p>Start to plan from what you learned. Sample goals are written in so the page reads like a used notebook.</p>
<h3>In 6 months from now I want to achieve…</h3>
<div class="workbook-box">Finish the manuscript of {t}, lock the tables, and hand a printed copy to the people named in the byline.</div>
<h3>What do I want to accomplish?</h3>
{_bullets([
    "Replace every sample sentence with a sentence from my file.",
    "Keep the theme — do not fight the margins.",
    "Publish once, flip every page, then fix only what is wrong.",
])}
<h3>June 2026</h3>
{_cal()}
<h3>Budget manager</h3>
{_table("Item", "Amount", [
    ("Design / template", "Included"),
    ("Printing (50 copies)", "₹12,400"),
    ("Courier", "₹1,800"),
    ("Reserve", "₹2,000"),
    ("Total", "₹16,200"),
])}
""",
        ),
        nxt(
            f"""
<h2>About the author</h2>
<p>{author} writes the kind of pages this template is built for. In your book this leaf becomes the bio, the acknowledgements, or a last essay — still in the same typeface and colour as chapter one.</p>
<p>{P}</p>
<p>{P2}</p>
<blockquote class="pull-quote">I am a quote on the back pages of this eBook. Your pull-quote will sit here, in this size.</blockquote>
<h2>A last word</h2>
<p>{P3}</p>
<p>{P4}</p>
<p>{P}</p>
<p class="caption">End of sample · {t} · click Use to drop your file into this theme.</p>
""",
        ),
    ]
    return "".join(pages)


def for_template(template_id: str) -> str:
    book = BOOKS.get(template_id) or BOOKS["cream-handbook"]
    return build_book(book)


def cover_for_template(template_id: str) -> str:
    """Single cover page — used for gallery thumbnails that match the real template."""
    book = BOOKS.get(template_id) or BOOKS["cream-handbook"]
    t = book["title"]
    author = book["author"]
    ch = book["chapters"]
    inner = f"""
<div class="demo-banner">Sample book — your Word or PDF content will flow into headings, paragraphs, and tables like this.</div>
<p class="book-kicker">{book["kicker"]}</p>
<h1 class="book-title">{t}</h1>
<p class="book-subtitle">{book["subtitle"]}</p>
<p class="book-byline">{book["byline"]}</p>
<p class="book-author">{author}</p>
<p class="lede">{P}</p>
<p>{P2}</p>
<h3>What you will find inside</h3>
{_bullets([ch[0], ch[1], ch[2] if len(ch) > 2 else "Checklists you can print", "Tables that stay editable after you publish"])}
<p>{P3}</p>
"""
    return page(1, inner, t, "cover-page")


def preview_page_count(template_id: str = "") -> int:
    return 14
