const params = new URLSearchParams(location.search);
const jobId = params.get("job");
let stage = params.get("stage") || "write";
const frame = document.getElementById("frame");
const crumb = document.getElementById("crumb");
const saveState = document.getElementById("saveState");

/** Keep the address bar on the same job + stage so refresh does not jump projects. */
function syncEditorUrl(nextStage) {
  if (!jobId) return;
  if (nextStage) stage = nextStage;
  const url = `/editor?job=${encodeURIComponent(jobId)}&stage=${encodeURIComponent(stage)}`;
  try {
    window.history.replaceState({ jobId, stage }, "", url);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem("epdf_job", jobId);
    sessionStorage.setItem("epdf_stage", stage);
  } catch {
    /* ignore */
  }
}

let selected = null;
let undoStack = [];
let histIndex = -1;
let pendingRestoreView = null;
let saveTimer = null;
let editorMode = "write";
let templateApplied = false;
let templates = window.EPDF_TEMPLATES || [];
let tplStageFilter = "All";
let tplStageSelected = null;
let tplPickId = null;
let reviewCache = { head: "", pages: [] };
let reviewActivePage = 0;
let reviewResizeObs = null;

const SELECT_CSS = `
html, body {
  height: auto !important;
  min-height: 100% !important;
  overflow: auto !important;
}
.epdf-selected {
  outline: none !important;
}
.epdf-table td.epdf-selected, .epdf-table th.epdf-selected {
  background: #eff6ff !important;
  outline: 2px solid #4da3ff !important;
  outline-offset: -1px;
}
.epdf-table td, .epdf-table th {
  position: relative;
}
.epdf-table { table-layout: fixed; }
body.epdf-resizing-table-col,
body.epdf-resizing-table-col * { cursor: col-resize !important; }
body.epdf-resizing-table-row,
body.epdf-resizing-table-row * { cursor: row-resize !important; }
.epdf-dragging { opacity: 0.5; }
.epdf-drop-line {
  outline: 2px dashed #3b82f6 !important;
  outline-offset: 4px;
}
.epdf-drop-page {
  outline: 2px dashed #60a5fa !important;
  outline-offset: -4px;
}
:root {
  --page-pad-x: 56px;
  --page-pad-y: 72px;
}
.epdf-page {
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  box-sizing: border-box !important;
  padding: var(--page-pad-y) var(--page-pad-x) calc(var(--page-pad-y) * 0.7) !important;
  position: relative !important;
}
.epdf-page.title-page,
.epdf-page.cover-page {
  padding-top: calc(var(--page-pad-y) * 1.15) !important;
}
.epdf-page.epdf-page-selected {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}
.epdf-col.epdf-col-selected {
  outline: 2px solid #2563eb !important;
  outline-offset: 2px;
  background: rgba(37, 99, 235, 0.04) !important;
  border-radius: 2px;
}
.epdf-col {
  min-width: 0;
  min-height: 0;
}
.epdf-figure {
  margin: 12px 0;
  max-width: 100%;
  box-sizing: border-box;
}
.epdf-figure img {
  max-width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
}
.epdf-figure.epdf-free-pos {
  position: absolute !important;
  margin: 0 !important;
  z-index: 6;
  max-width: none;
  cursor: move;
}
.epdf-figure.epdf-free-pos img {
  width: 100%;
  max-width: none;
  height: auto;
  display: block;
  pointer-events: none;
}
/* In-iframe selection chrome — same document as the text, so it can never drift */
#epdf-iframe-sel {
  position: absolute;
  pointer-events: none;
  z-index: 2147483000;
  border: 2px solid #4da3ff;
  box-sizing: border-box;
  border-radius: 4px;
  display: none;
  box-shadow: 0 0 0 1px rgba(255,255,255,.55);
  background: rgba(77, 163, 255, 0.04);
}
#epdf-iframe-sel.visible { display: block; }
#epdf-iframe-sel.no-resize .epdf-sel-resize { display: none; }
#epdf-iframe-sel .epdf-sel-move {
  position: absolute;
  top: -1px;
  left: -1px;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  background: #2563eb;
  border-radius: 6px 0 6px 0;
  cursor: grab !important;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  pointer-events: auto;
  user-select: none;
  box-shadow: 0 3px 10px rgba(37,99,235,.45);
  z-index: 2;
}
#epdf-iframe-sel .epdf-sel-resize {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  margin-top: -9px;
  background: #2563eb;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: ew-resize !important;
  pointer-events: auto;
  box-shadow: 0 2px 8px rgba(37,99,235,.4);
  z-index: 2;
}
#epdf-iframe-sel .epdf-sel-resize.left { left: -10px; }
#epdf-iframe-sel .epdf-sel-resize.right { right: -10px; }
#epdf-iframe-sel .epdf-sel-resize.left::after,
#epdf-iframe-sel .epdf-sel-resize.right::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 8px;
  margin: -4px 0 0 -3px;
  border-left: 1.5px solid #fff;
  border-right: 1.5px solid #fff;
  box-sizing: border-box;
}
#epdf-iframe-sel .epdf-sel-resize.bottom {
  left: 50%;
  right: auto;
  top: auto;
  bottom: -10px;
  margin-left: -9px;
  margin-top: 0;
  cursor: ns-resize !important;
  background: #fff;
  border-color: #2563eb;
}
#epdf-iframe-sel .epdf-sel-resize.bottom::after { display: none; }
#epdf-iframe-sel .epdf-sel-resize.corner {
  left: auto;
  right: -10px;
  top: auto;
  bottom: -10px;
  margin-top: 0;
  cursor: nwse-resize !important;
  background: #fff;
  border-color: #2563eb;
}
#epdf-iframe-sel .epdf-sel-resize.corner::after { display: none; }
.epdf-page p { margin: 0 0 14px !important; line-height: 1.72 !important; }
.epdf-page h1 { margin: 0 0 16px !important; }
.epdf-page h2 { margin: 28px 0 12px !important; }
.epdf-page h2:first-child,
.epdf-page h1:first-child { margin-top: 0 !important; }
.epdf-page h3 { margin: 20px 0 10px !important; }
.epdf-page ul, .epdf-page ol { margin: 0 0 16px !important; padding-left: 24px !important; }
.epdf-page-footer { margin-top: auto !important; padding-top: 20px !important; }
.epdf-page:not(.title-page) h1,
.epdf-page:not(.title-page) h2,
.epdf-page:not(.title-page) h3 {
  display: block !important;
  background: none !important;
  background-color: transparent !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
.epdf-page:not(.title-page) h2 {
  font-size: 20px !important;
  text-transform: none !important;
}
.epdf-page-footer { cursor: default; }
img { max-width: 100%; height: auto; cursor: pointer; }
.epdf-layout-2col {
  display: grid !important;
  grid-template-columns: minmax(0, var(--col-left, 1fr)) minmax(0, var(--col-right, 1fr));
  gap: var(--col-gap, 24px) !important;
  width: 100%;
  align-items: start;
  margin: 4px 0 8px;
  position: relative;
}
.epdf-col {
  min-width: 0;
  min-height: 0;
}
.epdf-col > p,
.epdf-col > h1,
.epdf-col > h2,
.epdf-col > h3,
.epdf-col > h4,
.epdf-col > h5,
.epdf-col > h6,
.epdf-col > blockquote,
.epdf-col > pre,
.epdf-col > ul,
.epdf-col > ol {
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.epdf-cols-2 .epdf-col > p,
.epdf-cols-2 .epdf-col > ul,
.epdf-cols-2 .epdf-col > ol {
  text-align: justify !important;
  hyphens: auto;
  text-align-last: left;
}
.epdf-col > .epdf-col-heading,
.epdf-col > span.epdf-col-heading {
  display: block !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.epdf-cols-2 .epdf-col > h1,
.epdf-cols-2 .epdf-col > h2,
.epdf-cols-2 .epdf-col > h3,
.epdf-cols-2 .epdf-col > h4,
.epdf-cols-2 .epdf-col > h5,
.epdf-cols-2 .epdf-col > h6,
.epdf-cols-2 .epdf-col > .epdf-col-heading {
  text-align: left !important;
  text-align-last: left !important;
  hyphens: none !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  line-height: 1.35 !important;
  margin: 0 0 12px !important;
  padding: 0 !important;
  border: none !important;
  background: none !important;
  background-color: transparent !important;
}
.epdf-cols-2 .epdf-col > h1 { font-size: 1.35em !important; }
.epdf-cols-2 .epdf-col > h2 { font-size: 1.2em !important; font-weight: 700 !important; }
.epdf-cols-2 .epdf-col > h3,
.epdf-cols-2 .epdf-col > .epdf-col-heading { font-size: 1.05em !important; font-weight: 700 !important; }
.epdf-cols-2 .epdf-col > h4 { font-size: 1em !important; font-weight: 600 !important; }
.epdf-cols-2 .epdf-col > blockquote,
.epdf-cols-2 .epdf-col > .callout,
.epdf-cols-2 .epdf-col > .pull-quote,
.epdf-cols-2 .epdf-col > .epdf-col-note {
  text-align: left !important;
  hyphens: none !important;
  font-style: italic !important;
  margin: 0 0 14px !important;
  padding: 10px 12px !important;
  border-left: 3px solid #64748b !important;
  background: #f8fafc !important;
  font-size: 0.92em !important;
  line-height: 1.55 !important;
}
.epdf-page.epdf-cols-2 > .epdf-span-all {
  grid-column: 1 / -1;
  width: 100% !important;
  max-width: 100% !important;
}
.epdf-span-all { grid-column: 1 / -1; width: 100%; margin-bottom: 8px; }
.epdf-table-full { width: 100% !important; max-width: 100% !important; table-layout: fixed; }
.epdf-table-page .epdf-page-footer { margin-top: auto; }
`;

const LAYOUT_CSS = `
:root {
  --page-pad-x: 56px;
  --page-pad-y: 72px;
  --col-gap: 24px;
}
.epdf-page {
  box-sizing: border-box;
  padding: var(--page-pad-y) var(--page-pad-x) calc(var(--page-pad-y) * 0.7);
}
.epdf-layout-2col {
  display: grid;
  grid-template-columns: minmax(0, var(--col-left, 1fr)) minmax(0, var(--col-right, 1fr));
  gap: var(--col-gap, 36px);
  width: 100%;
  align-items: start;
  margin: 4px 0 8px;
  position: relative;
}
.epdf-col {
  min-width: 0;
  min-height: 0;
}
.epdf-col > p { margin-bottom: 14px; }
.epdf-col > p,
.epdf-col > h1,
.epdf-col > h2,
.epdf-col > h3,
.epdf-col > h4,
.epdf-col > h5,
.epdf-col > h6,
.epdf-col > blockquote,
.epdf-col > pre,
.epdf-col > ul,
.epdf-col > ol {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
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
.epdf-page.epdf-cols-2 > .epdf-span-all {
  width: 100%;
  max-width: 100%;
}
.epdf-span-all { grid-column: 1 / -1; width: 100%; }
.epdf-table-full { width: 100%; max-width: 100%; table-layout: fixed; }
.epdf-table-page { display: flex; flex-direction: column; }
.epdf-page p { margin: 0 0 14px; line-height: 1.72; }
.epdf-page h2 { margin: 28px 0 12px; }
.epdf-page h2:first-child, .epdf-page h1:first-child { margin-top: 0; }
.epdf-page-footer { margin-top: auto; padding-top: 20px; }
`;

const BLOCK_SEL = "p, h1, h2, h3, h4, h5, span.epdf-col-heading, ul, ol, table, figure, blockquote, pre, img, div.callout, div.pull-quote";

let dragEl = null;
let replaceImage = false;
let reflowTimer = null;
let resizeState = null;
let pointerDrag = null;
let dragRaf = null;
let dragLatestEvent = null;
let dragGhostEl = null;
let dropIndicatorEl = null;
let selectedPage = null;
let selectedCol = null;
let snapshotDebounceTimer = null;
let skipNextSnapshot = false;

if (!jobId) {
  location.href = "/";
}

function doc() {
  return frame.contentDocument;
}

function selectedEl() {
  return selected && selected.isConnected ? selected : null;
}

function breadcrumb(el) {
  const parts = [];
  let n = el;
  while (n && n !== doc().body && parts.length < 8) {
    const name = n.getAttribute("data-epdf-slot")
      ? "Content"
      : n.tagName.charAt(0) + n.tagName.slice(1).toLowerCase();
    parts.unshift(name);
    n = n.parentElement;
  }
  return "Page > " + parts.join(" > ");
}

function clearColSelection() {
  doc()?.querySelectorAll(".epdf-col-selected").forEach((n) => n.classList.remove("epdf-col-selected"));
  selectedCol = null;
}

function markColSelected(col) {
  cleanupDragUi();
  doc()?.querySelectorAll(".epdf-selected").forEach((n) => n.classList.remove("epdf-selected"));
  doc()?.querySelectorAll(".epdf-page-selected").forEach((n) => n.classList.remove("epdf-page-selected"));
  clearColSelection();
  selected = null;
  selectedPage = null;
  selectedCol = col?.classList?.contains("epdf-col") && col.isConnected ? col : null;
  if (!selectedCol) {
    positionSelectionOverlay();
    positionPageOverlay();
    positionColOverlay();
    positionColDivider();
    syncLayoutBlockControls();
    return;
  }
  selectedCol.classList.add("epdf-col-selected");
  const which = selectedCol.getAttribute("data-col") === "2" ? "Right" : "Left";
  const propCrumb = document.getElementById("propCrumb");
  if (propCrumb) propCrumb.textContent = `Page › ${which} column`;
  if (crumb) crumb.textContent = `Page > ${which} column (drag blue divider to resize)`;
  const hint = document.getElementById("hint");
  if (hint) {
    hint.textContent = `${which} column selected — drag the blue divider (or use Left column width) to give this side more/less space.`;
  }
  showPanel("layout");
  syncColumnWidthInputs(selectedCol.closest(".epdf-page"));
  syncLayoutPanel();
  positionSelectionOverlay();
  positionPageOverlay();
  positionColOverlay();
  positionColDivider();
}

function markSelected(el) {
  cleanupDragUi();
  clearColSelection();
  doc().querySelectorAll(".epdf-selected").forEach((n) => n.classList.remove("epdf-selected"));
  doc().querySelectorAll(".epdf-page-selected").forEach((n) => n.classList.remove("epdf-page-selected"));
  selectedPage = null;
  selected = el || null;
  if (!selected) {
    if (crumb) crumb.textContent = "Click an element on the page to edit it.";
    const propCrumb = document.getElementById("propCrumb");
    if (propCrumb) propCrumb.textContent = "Page › Content";
    const hint = document.getElementById("hint");
    if (hint) hint.textContent = "Click anywhere to type. Press Enter for a new paragraph.";
    positionSelectionOverlay();
    positionPageOverlay();
    positionColOverlay();
    positionColDivider();
    syncLayoutBlockControls();
    return;
  }
  selected.classList.add("epdf-selected");
  if (crumb) crumb.textContent = breadcrumb(selected);
  const propCrumb = document.getElementById("propCrumb");
  if (propCrumb) propCrumb.textContent = breadcrumb(selected).replace(/^Page > /, "Page › ");
  const hint = document.getElementById("hint");
  if (hint) {
    if (selected.closest("table")) {
      hint.textContent = "Table: drag ← → to stretch width · bottom handle for height · Table panel for columns & rows.";
      showPanel("table");
    } else if (selected.closest("img, figure")) {
      hint.textContent = "Image: drag ⋮⋮ to move anywhere on the page · ← → handles resize width.";
    } else {
      hint.textContent = "Drag ← → to resize this block’s width. Use the Text panel slider too.";
    }
  }
  const block = movableBlock(selected);
  if (block) ensureBlockWidth(block);
  syncStyleInputs(selected);
  syncImageInputs(selected);
  syncTableColPanel(selected);
  fillMovePageGrid();
  decorateBlocks();
  positionSelectionOverlay();
  positionPageOverlay();
  positionColOverlay();
  positionColDivider();
  syncLayoutBlockControls();
}

function markPageSelected(page) {
  cleanupDragUi();
  doc().querySelectorAll(".epdf-selected").forEach((n) => n.classList.remove("epdf-selected"));
  doc().querySelectorAll(".epdf-page-selected").forEach((n) => n.classList.remove("epdf-page-selected"));
  clearColSelection();
  selected = null;
  selectedPage = page && page.classList?.contains("epdf-page") ? page : null;
  if (!selectedPage) {
    positionSelectionOverlay();
    positionPageOverlay();
    positionColOverlay();
    positionColDivider();
    return;
  }
  selectedPage.classList.add("epdf-page-selected");
  const idx = pageList().indexOf(selectedPage) + 1;
  const propCrumb = document.getElementById("propCrumb");
  if (propCrumb) propCrumb.textContent = `Page ${idx} › Page settings`;
  if (crumb) crumb.textContent = `Page ${idx} selected — duplicate, delete, or change layout below.`;
  const nav = document.getElementById("pageNav");
  nav?.querySelectorAll(".page-thumb").forEach((b, i) => {
    b.classList.toggle("on", i === idx - 1);
  });
  positionSelectionOverlay();
  positionPageOverlay();
  positionColOverlay();
  positionColDivider();
  syncLayoutPanel();
  syncPagePaddingInputs();
  showPanel("layout");
}

function clickTargetEl(e) {
  let t = e.target;
  if (t?.nodeType === 3) t = t.parentElement;
  return t?.nodeType === 1 ? t : null;
}

const EDITABLE_CLICK_SEL =
  "td, th, p, h1, h2, h3, h4, h5, h6, li, img, figcaption, figure, table, blockquote, pre, span.epdf-col-heading, div.callout, div.pull-quote";

function isHeadingBlock(el) {
  return !!el?.matches?.("h1, h2, h3, h4, h5, h6, span.epdf-col-heading");
}

function isNoteBlock(el) {
  return !!el?.matches?.("blockquote, .callout, .pull-quote, .epdf-col-note");
}

function normalizeColumnBlocks() {
  const d = doc();
  if (!d) return;
  d.querySelectorAll(".epdf-col > span, .epdf-page > span").forEach((span) => {
    if (span.closest(".epdf-page-footer, p, h1, h2, h3, h4, h5, h6, td, th, li, table, figcaption")) return;
    const text = (span.textContent || "").replace(/\s/g, "");
    if (!text) return;
    span.classList.add("epdf-col-heading");
    span.style.display = "block";
    span.style.boxSizing = "border-box";
  });
  d.querySelectorAll(".epdf-col blockquote, .epdf-col .callout, .epdf-col .pull-quote").forEach((n) => {
    if (n.closest("td, th")) return;
    n.classList.add("epdf-col-note");
    if (n.matches("blockquote, .callout, .pull-quote")) n.style.display = "block";
  });
}

function setBlockStyle(block, prop, value) {
  if (!block) return;
  const cssProp = prop.includes("-") ? prop : prop.replace(/([A-Z])/g, "-$1").toLowerCase();
  const useImportant =
    block.closest(".epdf-col") &&
    ["font-size", "line-height", "text-align", "letter-spacing", "font-weight", "width", "max-width", "margin-left", "min-height"].includes(cssProp);
  if (!value && value !== 0) {
    block.style.removeProperty(cssProp);
    return;
  }
  if (useImportant) block.style.setProperty(cssProp, String(value), "important");
  else block.style[prop] = value;
}

function editableTargetFromEvent(e) {
  // Prefer the real iframe event target — most reliable for left/right column clicks
  const t = clickTargetEl(e);
  if (t && !t.closest(".epdf-page-footer")) {
    let el = t.closest(EDITABLE_CLICK_SEL);
    if (el && !el.closest(".epdf-page-footer")) return el;
    if (t.closest("strong, em, b, i, span, a, u, sub, sup")) {
      el = t.closest("p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, pre, span.epdf-col-heading");
      if (el && !el.closest(".epdf-page-footer")) return el;
    }
    if (t.matches?.("span") && t.classList.contains("epdf-col-heading")) return t;
  }
  // Fallback hit-test (e.g. synthetic events / parent-doc clicks)
  const { hits } = iframeElementsAt(e.clientX, e.clientY);
  for (const node of hits) {
    if (node.closest?.(".epdf-page-footer")) continue;
    const block = node.closest?.(EDITABLE_CLICK_SEL);
    if (block && !block.closest(".epdf-page-footer")) return block;
  }
  return null;
}

function pickSelection(el, t) {
  if (!el) return null;
  if (el.matches("ul, ol")) return t?.closest?.("li") || el;
  if (el.matches("table")) return t?.closest?.("td, th") || el;
  return el;
}

function selectionBlock() {
  const el = selectedEl();
  if (!el) return null;
  const block = movableBlock(el);
  if (!block || block.closest(".epdf-page-footer")) return null;
  // Selecting a cell → resize the whole table
  if (el.closest?.("td, th")) return el.closest("table");
  return block;
}

function isResizableBlock(block) {
  if (!block) return false;
  // Cells themselves aren't resized — the table / text block is
  if (block.matches?.("td, th")) return false;
  return true;
}

function blockWidthContainer(block) {
  if (block?.classList?.contains("epdf-free-pos")) return block.closest(".epdf-page");
  return block?.closest(".epdf-col") || block?.closest(".epdf-page") || null;
}

function blockWidthPercent(block) {
  const container = blockWidthContainer(block);
  if (!container) return 100;
  const containerW = container.clientWidth || 1;
  return Math.min(100, Math.max(30, Math.round((block.getBoundingClientRect().width / containerW) * 100)));
}

function ensureBlockWidth(block) {
  if (!block || block.closest("td, th") || block.matches("table, img")) return;
  block.style.display = "block";
  block.style.boxSizing = "border-box";
  const col = block.closest(".epdf-col");
  const container = blockWidthContainer(block);
  const containerW = container?.clientWidth || 0;
  const w = block.getBoundingClientRect().width;

  if (col) {
    // Do not force-reset user widths — only fill the column when width was never set
    if (!block.style.width || block.style.width === "auto") {
      setBlockStyle(block, "width", "100%");
      setBlockStyle(block, "max-width", "100%");
    }
    return;
  }

  if (w > 0 && (!block.style.width || block.style.width === "auto" || block.style.width === "100%")) {
    block.style.width = `${Math.round(w)}px`;
    block.style.maxWidth = "100%";
  }
}

function iframeElementsAt(clientX, clientY) {
  const rect = frame.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return { x, y, hits: [] };
  const d = doc();
  if (!d) return { x, y, hits: [] };
  const hits = d.elementsFromPoint
    ? d.elementsFromPoint(x, y).filter((n) => n.nodeType === 1)
    : [d.elementFromPoint(x, y)].filter(Boolean);
  return { x, y, hits };
}

function iframeHitTest(clientX, clientY) {
  const { x, y, hits } = iframeElementsAt(clientX, clientY);
  const el = hits.find((n) => n.closest?.(".epdf-page")) || hits[0] || null;
  return el ? { x, y, el } : null;
}

function iframePointFromEvent(e) {
  return iframeHitTest(e.clientX, e.clientY);
}

function setOverlayDuringDrag(dragging) {
  const overlay = document.getElementById("epdf-sel-overlay");
  if (overlay) {
    overlay.classList.toggle("epdf-overlay-drag", dragging);
    overlay.style.pointerEvents = dragging ? "none" : "";
  }
  document.body.style.cursor = dragging ? "grabbing" : "";
  const iframeOv = doc()?.getElementById("epdf-iframe-sel");
  if (iframeOv) iframeOv.style.pointerEvents = dragging ? "none" : "";
}

function overlayHost() {
  return document.getElementById("paper") || document.querySelector(".paper") || document.querySelector(".canvas");
}

/**
 * Map iframe element boxes into overlay-host coordinates.
 * Always subtract in the SAME coordinate space (element vs documentElement),
 * then add the iframe's client origin in the parent — never mix spaces.
 */
function blockRectInHost(block, host) {
  if (!block || !host) return { left: 0, top: 0, width: 0, height: 0 };
  const br = block.getBoundingClientRect();
  const hr = host.getBoundingClientRect();
  const cs = getComputedStyle(host);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padT = parseFloat(cs.paddingTop) || 0;

  if (!frame || block.ownerDocument === document) {
    return {
      left: br.left - hr.left - padL + host.scrollLeft,
      top: br.top - hr.top - padT + host.scrollTop,
      width: br.width,
      height: br.height,
    };
  }

  const d = frame.contentDocument;
  const fr = frame.getBoundingClientRect();
  const root = d.documentElement.getBoundingClientRect();
  // Offset inside the iframe viewport (same-space math — works for local OR parent-translated rects)
  const inFrameLeft = br.left - root.left;
  const inFrameTop = br.top - root.top;
  const frameCS = getComputedStyle(frame);
  const borderL = parseFloat(frameCS.borderLeftWidth) || 0;
  const borderT = parseFloat(frameCS.borderTopWidth) || 0;
  const iframeClientLeft = fr.left + borderL;
  const iframeClientTop = fr.top + borderT;

  return {
    left: iframeClientLeft + inFrameLeft - hr.left - padL + host.scrollLeft,
    top: iframeClientTop + inFrameTop - hr.top - padT + host.scrollTop,
    width: br.width,
    height: br.height,
  };
}

function hideParentSelOverlay() {
  const parentOv = document.getElementById("epdf-sel-overlay");
  if (parentOv) {
    parentOv.classList.remove("visible");
    parentOv.setAttribute("aria-hidden", "true");
  }
}

function ensureIframeSelOverlay() {
  const d = doc();
  if (!d) return null;
  let ov = d.getElementById("epdf-iframe-sel");
  if (!ov) {
    ov = d.createElement("div");
    ov.id = "epdf-iframe-sel";
    ov.setAttribute("data-epdf-chrome", "1");
    ov.innerHTML = `
      <button type="button" class="epdf-sel-move" title="Drag to move">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
      </button>
      <span class="epdf-sel-resize left" data-resize="left" title="Drag to resize width"></span>
      <span class="epdf-sel-resize right" data-resize="right" title="Drag to resize width"></span>
      <span class="epdf-sel-resize bottom" data-resize="bottom" title="Drag to resize height"></span>
      <span class="epdf-sel-resize corner" data-resize="corner" title="Drag to resize width and height"></span>
    `;
    d.body.appendChild(ov);
  }
  if (ov.dataset.wired === "1") return ov;
  ov.dataset.wired = "1";
  ov.addEventListener("mousedown", (e) => e.stopPropagation());
  ov.addEventListener("click", (e) => e.stopPropagation());
  const moveBtn = ov.querySelector(".epdf-sel-move");
  moveBtn?.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    capturePointer(e);
    startPointerDrag(e);
  });
  // Fallback for browsers without pointer events
  moveBtn?.addEventListener("mousedown", (e) => {
    if (e.pointerType) return;
    e.preventDefault();
    e.stopPropagation();
    startPointerDrag(e);
  });
  ov.querySelectorAll("[data-resize]").forEach((h) => {
    h.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      capturePointer(e);
      startBlockResize(e, h.dataset.resize);
    });
    h.addEventListener("mousedown", (e) => {
      if (e.pointerType) return;
      e.preventDefault();
      e.stopPropagation();
      startBlockResize(e, h.dataset.resize);
    });
  });
  return ov;
}

function ensureSelectionOverlay() {
  // Parent overlay kept in DOM for legacy, but chrome now lives inside the iframe
  wireSelectionOverlay();
  hideParentSelOverlay();
  return ensureIframeSelOverlay();
}

function positionSelectionOverlay() {
  hideParentSelOverlay();
  const overlay = ensureIframeSelOverlay();
  if (!overlay || !frame) return;
  const block = selectionBlock();
  if (!block || editorMode !== "design" || selectedPage || selectedCol) {
    overlay.classList.remove("visible");
    overlay.setAttribute("aria-hidden", "true");
    return;
  }
  const page = block.closest(".epdf-page");
  if (!page) {
    overlay.classList.remove("visible");
    return;
  }
  // Keep chrome as a child of the page so left/top are page-local (same document — never drifts)
  if (overlay.parentElement !== page) page.appendChild(overlay);
  const br = block.getBoundingClientRect();
  const pr = page.getBoundingClientRect();
  // Draw the blue box OUTSIDE the text (not on the glyphs)
  const isText =
    /^(P|H1|H2|H3|H4|H5|H6|LI|BLOCKQUOTE|SPAN|A)$/i.test(block.tagName) ||
    block.classList?.contains("epdf-col-heading");
  const pad = isText ? 8 : block.matches?.("img, figure, table, .epdf-figure, .epdf-table") ? 4 : 6;
  overlay.style.left = `${br.left - pr.left - pad}px`;
  overlay.style.top = `${br.top - pr.top - pad}px`;
  overlay.style.width = `${Math.max(br.width + pad * 2, 48)}px`;
  overlay.style.height = `${Math.max(br.height + pad * 2, 28)}px`;
  overlay.classList.toggle("no-resize", !isResizableBlock(block));
  overlay.classList.add("visible");
  overlay.setAttribute("aria-hidden", "false");
}

function ensureDragGhost() {
  if (!dragGhostEl) {
    dragGhostEl = document.createElement("div");
    dragGhostEl.id = "epdf-drag-ghost";
    dragGhostEl.className = "epdf-drag-ghost";
    document.body.appendChild(dragGhostEl);
  }
  return dragGhostEl;
}

function ensureDropIndicator() {
  if (!dropIndicatorEl) {
    dropIndicatorEl = document.createElement("div");
    dropIndicatorEl.id = "epdf-drop-indicator";
    dropIndicatorEl.className = "epdf-drop-indicator";
    overlayHost()?.appendChild(dropIndicatorEl);
  }
  return dropIndicatorEl;
}

function showDragGhost(block, e) {
  const ghost = ensureDragGhost();
  const rect = block.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const label = (block.textContent || block.tagName || "Block").replace(/\s+/g, " ").trim().slice(0, 72);
  ghost.textContent = label || "Moving block…";
  ghost.style.width = `${Math.min(Math.max(rect.width, 120), 320)}px`;
  ghost.style.left = `${e.clientX + 14}px`;
  ghost.style.top = `${e.clientY + 14}px`;
  ghost.classList.add("visible");
}

function hideDragGhost() {
  dragGhostEl?.classList.remove("visible");
}

function isImageBlock(block) {
  return !!block?.matches?.("figure, img") || !!block?.classList?.contains("epdf-figure");
}

function imageFigure(block) {
  if (!block) return null;
  if (block.matches("figure")) return block;
  return block.closest?.("figure") || null;
}

function blockSpansFullWidth(el) {
  return !!el?.classList?.contains("epdf-span-all");
}

function cleanupDragUi() {
  hideDragGhost();
  hideDropIndicator();
  document.body.classList.remove("epdf-dragging-page");
  setOverlayDuringDrag(false);
  clearDropMarks();
  document.querySelectorAll(".page-thumb.drop-on").forEach((t) => t.classList.remove("drop-on"));
  if (pointerDrag?.block) pointerDrag.block.classList.remove("epdf-dragging");
  pointerDrag = null;
  dragEl = null;
  if (dragRaf) {
    cancelAnimationFrame(dragRaf);
    dragRaf = null;
  }
  dragLatestEvent = null;
}

function hideDropIndicator() {
  dropIndicatorEl?.classList.remove("visible");
}

function updateDropIndicator(e, block) {
  const indicator = ensureDropIndicator();
  const host = overlayHost();
  const pt = iframePointFromEvent(e);
  if (!host || !pt?.el) {
    indicator.classList.remove("visible");
    return;
  }
  const target = movableBlock(pt.el.closest?.(BLOCK_SEL));
  if (target && target !== block && !target.contains(block)) {
    const iframeRect = target.getBoundingClientRect();
    const after = e.clientY > iframeRect.top + iframeRect.height / 2;
    const rect = blockRectInHost(target, host);
    indicator.style.left = `${rect.left}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.style.top = `${after ? rect.top + rect.height - 2 : rect.top - 2}px`;
    indicator.classList.add("visible");
  } else {
    indicator.classList.remove("visible");
  }
}

function mountPageNavThumb(slot, page) {
  if (!slot || !page || !doc()) return;
  const headHtml = doc().head.innerHTML;
  if (window.EPDF_GALLERY?.mountReviewThumb) {
    window.EPDF_GALLERY.mountReviewThumb(slot, headHtml, page.outerHTML);
  } else if (window.EPDF_GALLERY?.mountPageMini) {
    window.EPDF_GALLERY.mountPageMini(slot, page);
  }
}

function refreshPageNavThumb(pageIndex) {
  const nav = document.getElementById("pageNav");
  const pages = pageList();
  const page = pages[pageIndex];
  const btn = nav?.querySelector(`.page-thumb[data-i="${pageIndex}"]`);
  if (!btn || !page) return;
  const slot = btn.querySelector(".page-thumb-slot") || btn;
  mountPageNavThumb(slot.classList.contains("page-thumb-slot") ? slot : btn, page);
}

function refreshPageNavThumbs(indices) {
  [...new Set(indices.filter((i) => i >= 0))].forEach((i) => refreshPageNavThumb(i));
  updateDocMeta();
}

function pageIndexOf(el) {
  const page = el?.closest?.(".epdf-page");
  return page ? pageList().indexOf(page) : -1;
}

function placeBlockNear(block, target, clientY) {
  if (!block || !target || block === target || block.contains(target) || target.contains(block)) return false;
  const page = target.closest(".epdf-page");
  if (!page || !page.contains(block)) return false;
  const rect = target.getBoundingClientRect();
  const after = clientY > rect.top + rect.height / 2;
  const container = target.parentElement;
  if (after) {
    let sib = target.nextElementSibling;
    while (sib && (sib.classList.contains("epdf-handle") || sib.classList.contains("epdf-page-footer"))) {
      sib = sib.nextElementSibling;
    }
    if (sib && sib !== block) container.insertBefore(block, sib);
    else if (container?.classList?.contains("epdf-col")) container.appendChild(block);
    else page.insertBefore(block, page.querySelector(".epdf-page-footer"));
  } else {
    container.insertBefore(block, target);
  }
  return true;
}

function finishBlockDrop(block, e) {
  const srcIdx = pageIndexOf(block);
  const thumb = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".page-thumb");
  if (thumb) {
    moveBlockToPage(block, +thumb.dataset.i, { skipNav: true });
    refreshPageNavThumbs([srcIdx, +thumb.dataset.i]);
    return true;
  }
  const pt = iframeHitTest(e.clientX, e.clientY);
  if (!pt?.el) return false;
  const target = movableBlock(pt.el.closest?.(BLOCK_SEL));
  const page = pt.el.closest?.(".epdf-page");
  if (target && target !== block) {
    if (target.closest(".epdf-page") === block.closest(".epdf-page")) {
      placeBlockNear(block, target, e.clientY);
    } else {
      placeBlock(block, target.closest(".epdf-page"), target);
    }
  } else if (page) {
    placeBlock(block, page, contentBlocks(page)[0] || page.querySelector(".epdf-page-footer"));
  } else {
    return false;
  }
  const destIdx = pageIndexOf(block);
  markSelected(block);
  snapshot();
  decorateBlocks();
  resizeFrame();
  renumberPages();
  refreshPageNavThumbs([srcIdx, destIdx]);
  return true;
}

function highlightPageThumb(e) {
  document.querySelectorAll(".page-thumb.drop-on").forEach((t) => t.classList.remove("drop-on"));
  const thumb = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".page-thumb");
  if (thumb) thumb.classList.add("drop-on");
}

function updateIframeDropMark(e, block) {
  clearDropMarks();
  const pt = iframePointFromEvent(e);
  if (!pt?.el) return;
  const target = movableBlock(pt.el.closest?.(BLOCK_SEL));
  if (target && target !== block && !target.contains(block)) {
    target.classList.add("epdf-drop-line");
  } else {
    const page = pt.el.closest?.(".epdf-page");
    if (page) page.classList.add("epdf-drop-page");
  }
}

function enableFreeImagePosition(block) {
  const fig = imageFigure(block) || block;
  const page = fig?.closest?.(".epdf-page");
  if (!fig || !page || fig.classList.contains("epdf-free-pos")) return fig;
  const pageRect = page.getBoundingClientRect();
  const rect = fig.getBoundingClientRect();
  const left = rect.left - pageRect.left + page.scrollLeft;
  const top = rect.top - pageRect.top + page.scrollTop;
  // Move figure to be a direct child of the page so absolute coords are page-relative
  if (fig.parentElement !== page) {
    page.appendChild(fig);
  }
  fig.classList.add("epdf-free-pos");
  fig.style.position = "absolute";
  fig.style.left = `${Math.max(0, left)}px`;
  fig.style.top = `${Math.max(0, top)}px`;
  fig.style.width = `${Math.round(rect.width)}px`;
  fig.style.margin = "0";
  fig.style.zIndex = "6";
  const img = fig.querySelector("img");
  if (img) {
    img.style.width = "100%";
    img.style.height = "auto";
  }
  return fig;
}

function startFreeImageDrag(e, block) {
  const fig = enableFreeImagePosition(block);
  const page = fig?.closest?.(".epdf-page");
  if (!fig || !page) return false;
  const pageRect = page.getBoundingClientRect();
  const rect = fig.getBoundingClientRect();
  pointerDrag = {
    block: fig,
    free: true,
    page,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    pageLeft: pageRect.left,
    pageTop: pageRect.top,
  };
  markSelected(fig.querySelector("img") || fig);
  return true;
}

function onFreeImageDragFrame(e) {
  if (!pointerDrag?.free || !pointerDrag.block) return;
  const { block, page, offsetX, offsetY } = pointerDrag;
  const pageRect = page.getBoundingClientRect();
  const maxL = Math.max(0, page.clientWidth - block.offsetWidth);
  const maxT = Math.max(0, page.scrollHeight - 40);
  let left = e.clientX - pageRect.left - offsetX + page.scrollLeft;
  let top = e.clientY - pageRect.top - offsetY + page.scrollTop;
  left = Math.max(0, Math.min(maxL, left));
  top = Math.max(0, Math.min(maxT, top));
  block.style.left = `${left}px`;
  block.style.top = `${top}px`;
  positionSelectionOverlay();
}

function startPointerDrag(e) {
  if (e.button != null && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const block = selectionBlock();
  if (!block) return;

  const endDrag = (ev) => {
    unbind();
    onPointerDragEnd(ev);
  };
  let unbind = () => {};

  // Images: Designrr-style free move anywhere on the page
  if (isImageBlock(block)) {
    if (!startFreeImageDrag(e, block)) return;
    const onMove = (ev) => onPointerDragMove(ev);
    unbind = bindDragTracking(onMove, endDrag);
    pointerDrag.unbind = unbind;
    setFramePointerPassThrough(true);
    return;
  }

  pointerDrag = { block, startX: e.clientX, startY: e.clientY, moved: false, free: false };
  const onMove = (ev) => onPointerDragMove(ev);
  unbind = bindDragTracking(onMove, endDrag);
  pointerDrag.unbind = unbind;
}

function onPointerDragEnd(e) {
  if (!pointerDrag) {
    cleanupDragUi();
    return;
  }
  const block = pointerDrag.block;
  const moved = pointerDrag.moved;
  const free = pointerDrag.free;
  const unbind = pointerDrag.unbind;
  if (unbind) {
    try {
      unbind();
    } catch {
      /* ignore */
    }
  }
  cleanupDragUi();
  setFramePointerPassThrough(false);
  if (free) {
    if (moved) {
      markSelected(block.querySelector?.("img") || block);
      snapshot();
      resizeFrame();
      refreshPageNavThumb(pageIndexOf(block));
    }
    positionSelectionOverlay();
    return;
  }
  if (moved && e) finishBlockDrop(block, e);
  else positionSelectionOverlay();
}

function onPointerDragMove(e) {
  if (!pointerDrag) return;
  dragLatestEvent = e;
  if (dragRaf) return;
  dragRaf = requestAnimationFrame(() => {
    dragRaf = null;
    if (dragLatestEvent) onPointerDragMoveFrame(dragLatestEvent);
  });
}

function onPointerDragMoveFrame(e) {
  if (!pointerDrag) return;
  const dx = e.clientX - pointerDrag.startX;
  const dy = e.clientY - pointerDrag.startY;
  if (!pointerDrag.moved && Math.hypot(dx, dy) < 4) return;
  if (!pointerDrag.moved) {
    pointerDrag.moved = true;
    document.body.classList.add("epdf-dragging-page");
    setFramePointerPassThrough(true);
    setOverlayDuringDrag(true);
    if (!pointerDrag.free) showDragGhost(pointerDrag.block, e);
  }
  if (pointerDrag.free) {
    onFreeImageDragFrame(e);
    return;
  }
  pointerDrag.block.classList.add("epdf-dragging");
  dragEl = pointerDrag.block;
  const ghost = ensureDragGhost();
  ghost.style.left = `${e.clientX + 14}px`;
  ghost.style.top = `${e.clientY + 14}px`;
  highlightPageThumb(e);
  updateDropIndicator(e, pointerDrag.block);
  updateIframeDropMark(e, pointerDrag.block);
}

function wireSelectionOverlay() {
  const overlay = document.getElementById("epdf-sel-overlay");
  if (!overlay || overlay.dataset.wired === "1") return;
  overlay.dataset.wired = "1";
  // Parent overlay is unused for positioning (iframe chrome is source of truth)
  overlay.style.display = "none";
}

function positionColOverlay() {
  const overlay = document.getElementById("epdf-col-overlay");
  const host = overlayHost();
  if (!overlay || !host || !frame || editorMode !== "design") {
    overlay?.classList.remove("visible");
    return;
  }
  const col = selectedCol?.isConnected ? selectedCol : null;
  if (!col) {
    overlay.classList.remove("visible");
    overlay.setAttribute("aria-hidden", "true");
    return;
  }
  const rect = blockRectInHost(col, host);
  const which = col.getAttribute("data-col") === "2" ? "2" : "1";
  const leftPct = readColumnLeftPct(col.closest(".epdf-page"));
  const rightPct = 100 - leftPct;
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${Math.max(rect.height, 40)}px`;
  overlay.classList.remove("col-side-1", "col-side-2");
  overlay.classList.add(`col-side-${which}`);
  overlay.classList.add("visible");
  overlay.setAttribute("aria-hidden", "false");
  const label = document.getElementById("epdfColResizeLabel");
  if (label) {
    label.textContent =
      which === "2"
        ? `Right ${rightPct}% — drag INNER blue edge ← →`
        : `Left ${leftPct}% — drag INNER blue edge ← →`;
  }
}

function wireColOverlay() {
  const overlay = document.getElementById("epdf-col-overlay");
  if (!overlay || overlay.dataset.wired === "1") return;
  overlay.dataset.wired = "1";
  overlay.querySelectorAll("[data-col-resize]").forEach((h) => {
    h.addEventListener("mousedown", (e) => startColumnResize(e, h.dataset.colResize));
  });
}

function positionColDivider() {
  const divider = document.getElementById("epdf-col-divider");
  const host = overlayHost();
  if (!divider || !host || !frame || editorMode !== "design") {
    divider?.classList.remove("visible", "dragging");
    return;
  }
  const page =
    (selectedCol && selectedCol.closest(".epdf-page")) ||
    selectedPage ||
    currentPage();
  const layout = page?.querySelector?.(".epdf-layout-2col");
  const col1 = layout?.querySelector?.('.epdf-col[data-col="1"]');
  const layoutPanelOpen = !!document.querySelector('.panel-block[data-view="layout"]:not(.hidden)');
  const shouldShow =
    layout &&
    col1 &&
    pageLayoutCols(page) === 2 &&
    (selectedCol || layoutPanelOpen || selectedPage);

  if (!shouldShow) {
    divider.classList.remove("visible");
    divider.setAttribute("aria-hidden", "true");
    return;
  }
  const layoutRect = blockRectInHost(layout, host);
  const colRect = blockRectInHost(col1, host);
  const gap = parseInt(page.dataset.colGap || "24", 10) || 24;
  const x = colRect.left + colRect.width + gap / 2;
  // Keep divider inside the layout bounds (never over the app chrome)
  if (x < layoutRect.left - 4 || x > layoutRect.left + layoutRect.width + 4) {
    divider.classList.remove("visible");
    return;
  }
  divider.style.left = `${x}px`;
  divider.style.top = `${layoutRect.top}px`;
  divider.style.height = `${Math.max(layoutRect.height, 48)}px`;
  divider.classList.add("visible");
  divider.setAttribute("aria-hidden", "false");
}

function positionPageOverlay() {
  const overlay = document.getElementById("epdf-page-overlay");
  const toolbar = document.getElementById("epdf-page-toolbar");
  const host = overlayHost();
  const page = selectedPage && selectedPage.isConnected ? selectedPage : null;
  if (!overlay || !host || !frame || !page || editorMode !== "design") {
    overlay?.classList.remove("visible");
    toolbar?.classList.remove("visible");
    positionColDivider();
    return;
  }
  const rect = blockRectInHost(page, host);
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.classList.add("visible");
  if (toolbar) {
    toolbar.style.left = `${rect.left + Math.max(0, rect.width - toolbar.offsetWidth - 8)}px`;
    toolbar.style.top = `${Math.max(rect.top - 44, 8)}px`;
    toolbar.classList.add("visible");
  }
  positionColDivider();
}

function readPagePadding(page) {
  if (!page) return { top: 72, sides: 56, gap: 24 };
  const cs = doc().defaultView.getComputedStyle(page);
  const top = parseInt(page.dataset.padTop || cs.paddingTop, 10) || 72;
  const sides = parseInt(page.dataset.padX || cs.paddingLeft, 10) || 56;
  const layout = page.querySelector(".epdf-layout-2col");
  let gap = 36;
  if (layout) {
    gap = parseInt(page.dataset.colGap || doc().defaultView.getComputedStyle(layout).gap, 10) || 36;
  }
  return { top, sides, gap };
}

function readColumnLeftPct(page) {
  const n = parseInt(page?.dataset?.colLeft || "50", 10);
  return Math.min(95, Math.max(5, Number.isFinite(n) ? n : 50));
}

function leftPctFromClientX(page, layout, clientX) {
  const rect = layout.getBoundingClientRect();
  const gap = parseInt(page.dataset.colGap || "24", 10) || 24;
  const usable = Math.max(40, rect.width - gap);
  const leftPx = clientX - rect.left - gap / 2;
  return Math.min(95, Math.max(5, (leftPx / usable) * 100));
}

function applyColumnWidths(page, leftPct, opts = {}) {
  if (!page) return;
  const layout = page.querySelector(".epdf-layout-2col");
  if (!layout) return;
  const left = Math.min(95, Math.max(5, Math.round(leftPct)));
  const right = 100 - left;
  page.dataset.colLeft = String(left);
  layout.style.setProperty("--col-left", `${left}fr`);
  layout.style.setProperty("--col-right", `${right}fr`);
  layout.style.gridTemplateColumns = `minmax(0, ${left}fr) minmax(0, ${right}fr)`;
  if (!opts.silent) {
    syncColumnWidthInputs(page);
    positionColDivider();
    positionColOverlay();
    positionSelectionOverlay();
  }
}

function syncColumnWidthInputs(page) {
  const p = page || selectedPage || currentPage();
  const field = document.getElementById("pageColWidthField");
  const in2 = p && pageLayoutCols(p) === 2;
  if (field) field.hidden = !in2;
  if (!in2 || !p) return;
  const left = readColumnLeftPct(p);
  const input = document.getElementById("pageColLeft");
  const val = document.getElementById("pageColLeftVal");
  if (input) input.value = String(left);
  if (val) val.textContent = `${left}%`;
  document.querySelectorAll("#colRatioPresets [data-col-left]").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.colLeft) === left);
  });
}

let colResizeState = null;

function setFramePointerPassThrough(on) {
  if (frame) frame.style.pointerEvents = on ? "none" : "";
}

/** Attach move/up on BOTH parent + iframe so drags started inside the iframe keep tracking. */
function bindDragTracking(onMove, onUp) {
  const opts = { capture: true };
  document.addEventListener("pointermove", onMove, opts);
  document.addEventListener("pointerup", onUp, opts);
  document.addEventListener("pointercancel", onUp, opts);
  document.addEventListener("mousemove", onMove, opts);
  document.addEventListener("mouseup", onUp, opts);
  const win = frame?.contentWindow;
  if (win) {
    try {
      win.addEventListener("pointermove", onMove, opts);
      win.addEventListener("pointerup", onUp, opts);
      win.addEventListener("pointercancel", onUp, opts);
      win.addEventListener("mousemove", onMove, opts);
      win.addEventListener("mouseup", onUp, opts);
    } catch {
      /* ignore cross-origin */
    }
  }
  return () => {
    document.removeEventListener("pointermove", onMove, opts);
    document.removeEventListener("pointerup", onUp, opts);
    document.removeEventListener("pointercancel", onUp, opts);
    document.removeEventListener("mousemove", onMove, opts);
    document.removeEventListener("mouseup", onUp, opts);
    if (win) {
      try {
        win.removeEventListener("pointermove", onMove, opts);
        win.removeEventListener("pointerup", onUp, opts);
        win.removeEventListener("pointercancel", onUp, opts);
        win.removeEventListener("mousemove", onMove, opts);
        win.removeEventListener("mouseup", onUp, opts);
      } catch {
        /* ignore */
      }
    }
  };
}

function capturePointer(e) {
  const t = e.currentTarget || e.target;
  if (t && e.pointerId != null && t.setPointerCapture) {
    try {
      t.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  return t;
}

function startColumnResize(e, edge) {
  if (e.button != null && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const page =
    (selectedCol && selectedCol.closest(".epdf-page")) ||
    selectedPage ||
    currentPage();
  const layout = page?.querySelector?.(".epdf-layout-2col");
  if (!page || !layout) return;
  if (!selectedCol) {
    const col1 = layout.querySelector('.epdf-col[data-col="1"]');
    if (col1) markColSelected(col1);
  }
  colResizeState = { page, layout, edge: edge || "divider" };
  document.body.classList.add("epdf-resizing-cols");
  setFramePointerPassThrough(true);
  document.getElementById("epdf-col-divider")?.classList.add("dragging");
  document.getElementById("epdf-col-overlay")?.classList.add("resizing");
  applyColumnWidths(page, leftPctFromClientX(page, layout, e.clientX), { silent: false });
  const onMove = (ev) => onColumnResizeMove(ev);
  const onUp = () => {
    unbind();
    endColumnResize();
  };
  const unbind = bindDragTracking(onMove, onUp);
  colResizeState.unbind = unbind;
}

function onColumnResizeMove(e) {
  if (!colResizeState) return;
  e.preventDefault?.();
  const { page, layout } = colResizeState;
  applyColumnWidths(page, leftPctFromClientX(page, layout, e.clientX), { silent: false });
}

function endColumnResize() {
  document.body.classList.remove("epdf-resizing-cols");
  setFramePointerPassThrough(false);
  document.getElementById("epdf-col-divider")?.classList.remove("dragging");
  document.getElementById("epdf-col-overlay")?.classList.remove("resizing");
  if (colResizeState?.unbind) {
    try {
      colResizeState.unbind();
    } catch {
      /* ignore */
    }
  }
  if (colResizeState) {
    snapshot();
    refreshPageNavThumb(pageList().indexOf(colResizeState.page));
    colResizeState = null;
  }
  positionColDivider();
  positionColOverlay();
}

function applyPagePadding(page, top, sides, gap) {
  if (!page) return;
  page.dataset.padTop = String(top);
  page.dataset.padX = String(sides);
  page.style.setProperty("--page-pad-y", `${top}px`);
  page.style.setProperty("--page-pad-x", `${sides}px`);
  page.style.padding = `${top}px ${sides}px ${Math.round(top * 0.7)}px`;
  const layout = page.querySelector(".epdf-layout-2col");
  if (layout && gap) {
    page.dataset.colGap = String(gap);
    layout.style.setProperty("--col-gap", `${gap}px`);
    layout.style.gap = `${gap}px`;
  }
  positionPageOverlay();
  refreshPageNavThumb(pageList().indexOf(page));
}

function syncPagePaddingInputs() {
  const page = selectedPage || currentPage();
  if (!page?.classList?.contains("epdf-page")) return;
  const { top, sides, gap } = readPagePadding(page);
  const map = [
    ["pagePadTop", "pagePadTopVal", top],
    ["pagePadSides", "pagePadSidesVal", sides],
    ["pageColGap", "pageColGapVal", gap],
  ];
  map.forEach(([id, valId, v]) => {
    const input = document.getElementById(id);
    const val = document.getElementById(valId);
    if (input) input.value = String(v);
    if (val) val.textContent = `${v}px`;
  });
  const gapField = document.getElementById("pageColGapField");
  if (gapField) gapField.classList.toggle("hidden", pageLayoutCols(page) !== 2);
}

function blockHeightReference(block) {
  const page = block?.closest?.(".epdf-page");
  return page?.clientHeight || blockWidthContainer(block)?.clientHeight || 800;
}

function readBlockMinHeightPx(block) {
  if (!block) return 0;
  const inline = block.style.minHeight;
  if (inline?.endsWith("px")) return parseInt(inline, 10) || 0;
  const cs = doc()?.defaultView?.getComputedStyle(block);
  if (cs?.minHeight?.endsWith("px")) {
    const n = parseInt(cs.minHeight, 10);
    if (n > 0) return n;
  }
  return Math.round(block.getBoundingClientRect().height);
}

function blockHeightPercent(block) {
  const ref = blockHeightReference(block);
  const h = readBlockMinHeightPx(block);
  if (!block?.style.minHeight && !block?.style.height) return 0;
  return Math.min(120, Math.max(0, Math.round((h / ref) * 100)));
}

function syncBlockWidthUi(block) {
  const bwVal = document.getElementById("blockWidthVal");
  const bwInput = document.getElementById("blockWidth");
  if (!block || !bwInput) return;
  const pct = blockWidthPercent(block);
  bwInput.value = String(pct);
  if (bwVal) bwVal.textContent = `${pct}%`;
}

function syncBlockHeightUi(block) {
  const bhVal = document.getElementById("blockHeightVal");
  const bhInput = document.getElementById("blockHeight");
  if (!block || !bhInput) return;
  const pct = blockHeightPercent(block);
  bhInput.value = String(pct);
  if (bhVal) bhVal.textContent = pct ? `${pct}%` : "Auto";
}

function applyBlockHeight(block, pct) {
  if (!block) return;
  block.style.display = "block";
  block.style.boxSizing = "border-box";
  if (pct <= 0) {
    setBlockStyle(block, "min-height", "");
    block.style.height = "";
  } else {
    const ref = blockHeightReference(block);
    const clamped = Math.min(120, Math.max(15, pct));
    const h = Math.max(32, Math.round((ref * clamped) / 100));
    setBlockStyle(block, "min-height", `${h}px`);
  }
  syncBlockHeightUi(block);
  positionSelectionOverlay();
}

function applyBlockWidth(block, pct) {
  const container = blockWidthContainer(block);
  if (!container) return;
  const clamped = Math.min(100, Math.max(15, pct));
  block.style.display = "block";
  block.style.boxSizing = "border-box";
  if (block.matches?.("table")) {
    block.style.width = clamped + "%";
    block.style.maxWidth = "100%";
    block.style.tableLayout = "fixed";
    const tw = document.getElementById("tableWidth");
    const twVal = document.getElementById("tableWidthVal");
    if (tw) tw.value = String(clamped);
    if (twVal) twVal.textContent = clamped + "%";
  } else {
    const w = `${Math.round((container.clientWidth * clamped) / 100)}px`;
    if (block.closest(".epdf-col")) {
      setBlockStyle(block, "width", w);
      setBlockStyle(block, "max-width", "100%");
    } else {
      block.style.width = w;
      block.style.maxWidth = "100%";
    }
  }
  const bwVal = document.getElementById("blockWidthVal");
  const bwInput = document.getElementById("blockWidth");
  if (bwVal) bwVal.textContent = `${clamped}%`;
  if (bwInput) bwInput.value = String(clamped);
  positionSelectionOverlay();
}

function applyBlockWidthOnly(block, side, dx, dy, state, clientX) {
  const { startWidth, containerWidth, marginLeft } = state;
  const minW = 24;
  const page = block.closest(".epdf-page");
  const col = block.closest(".epdf-col");
  const colSide = col?.getAttribute("data-col");
  const layout = page?.querySelector?.(".epdf-layout-2col");
  const x = Number.isFinite(clientX) ? clientX : state.startX + dx;
  const maxW = Math.max(minW + 8, containerWidth - 4);

  // Only switch to COLUMN resize when the block is already at (or hits) the column edge.
  // Do NOT steal normal block widening — that made right-column drag feel broken.
  if (layout && page && colSide) {
    const projected =
      side === "left" ? startWidth - dx : side === "right" || side === "corner" ? startWidth + dx : startWidth;
    const atOrPastEdge = state.columnResize || projected >= maxW - 1;
    const pullingOut =
      (colSide === "2" && side === "left" && dx < 0) ||
      (colSide === "1" && (side === "right" || side === "corner") && dx > 0);
    if (atOrPastEdge && pullingOut) {
      state.columnResize = true;
      applyColumnWidths(page, leftPctFromClientX(page, layout, x), { silent: false });
      setBlockStyle(block, "width", "100%");
      setBlockStyle(block, "max-width", "100%");
      setBlockStyle(block, "margin-left", "");
      state.containerWidth = blockWidthContainer(block)?.clientWidth || state.containerWidth;
      state.startWidth = Math.min(state.containerWidth, Math.max(minW, state.containerWidth - 4));
      return;
    }
  }

  let newWidth = startWidth;
  if (side === "right" || side === "corner") {
    newWidth = Math.max(minW, Math.min(maxW, startWidth + dx));
  } else if (side === "left") {
    newWidth = Math.max(minW, Math.min(maxW, startWidth - dx));
    if (block.classList.contains("epdf-free-pos")) {
      const curLeft = parseFloat(block.style.left) || 0;
      block.style.left = `${Math.max(0, curLeft + dx)}px`;
    } else {
      const newMargin = Math.max(0, Math.min(containerWidth - newWidth - 4, marginLeft + dx));
      if (block.closest(".epdf-col")) setBlockStyle(block, "margin-left", `${Math.round(newMargin)}px`);
      else block.style.marginLeft = `${Math.round(newMargin)}px`;
    }
  }
  const w = `${Math.round(newWidth)}px`;
  if (isImageBlock(block)) {
    const fig = imageFigure(block) || block;
    fig.style.width = w;
    fig.style.maxWidth = block.classList.contains("epdf-free-pos") ? "none" : "100%";
    const img = fig.querySelector?.("img") || (fig.matches("img") ? fig : null);
    if (img) {
      img.style.width = "100%";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
    }
  } else if (block.matches?.("table")) {
    const pct = Math.max(30, Math.min(100, Math.round((newWidth / containerWidth) * 100)));
    block.style.width = pct + "%";
    block.style.maxWidth = "100%";
    block.style.tableLayout = "fixed";
  } else if (block.closest(".epdf-col")) {
    setBlockStyle(block, "width", w);
    setBlockStyle(block, "max-width", "100%");
  } else {
    block.style.width = w;
    block.style.maxWidth = "100%";
  }
}

function applyBlockHeightOnly(block, side, dy, state) {
  const { startHeight, containerHeight } = state;
  const maxH = Math.round(containerHeight * 1.2);
  const newH = Math.max(32, Math.min(maxH, startHeight + dy));
  if (block.matches?.("table")) {
    block.style.minHeight = `${Math.round(newH)}px`;
    block.style.height = "";
  } else {
    setBlockStyle(block, "min-height", `${Math.round(newH)}px`);
  }
}

function startBlockResize(e, side) {
  if (e.button != null && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const block = selectionBlock();
  if (!block || !isResizableBlock(block)) return;
  const container = blockWidthContainer(block);
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const rect = block.getBoundingClientRect();
  const cs = doc().defaultView.getComputedStyle(block);
  resizeState = {
    side,
    block,
    container,
    startX: e.clientX,
    startY: e.clientY,
    startWidth: rect.width,
    startHeight: readBlockMinHeightPx(block),
    startLeft: rect.left - containerRect.left,
    containerWidth: Math.max(container.clientWidth, rect.width, 40),
    containerHeight: blockHeightReference(block),
    marginLeft: parseFloat(cs.marginLeft) || 0,
    columnResize: false,
  };
  document.body.classList.add("epdf-resizing-block");
  setFramePointerPassThrough(true);
  const onMove = (ev) => onBlockResizeMove(ev);
  const onUp = () => {
    unbind();
    endBlockResize();
  };
  const unbind = bindDragTracking(onMove, onUp);
  resizeState.unbind = unbind;
}

function onBlockResizeMove(e) {
  if (!resizeState) return;
  e.preventDefault?.();
  const { side, block, startX, startY } = resizeState;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  block.style.display = "block";
  block.style.boxSizing = "border-box";
  if (side === "bottom" || side === "corner") {
    applyBlockHeightOnly(block, side, dy, resizeState);
  }
  if (side === "left" || side === "right" || side === "corner") {
    applyBlockWidthOnly(block, side, dx, dy, resizeState, e.clientX);
  }
  positionSelectionOverlay();
  syncBlockWidthUi(block);
  syncBlockHeightUi(block);
}

function endBlockResize() {
  document.body.classList.remove("epdf-resizing-block");
  setFramePointerPassThrough(false);
  if (resizeState?.unbind) {
    try {
      resizeState.unbind();
    } catch {
      /* ignore */
    }
  }
  if (resizeState) {
    snapshot();
    resizeState = null;
  }
  positionSelectionOverlay();
}

function isTransparentColor(color) {
  return !color || color === "transparent" || color === "rgba(0, 0, 0, 0)";
}

function rgbToHex(rgb) {
  if (isTransparentColor(rgb)) return "";
  const m = rgb.match(/\d+/g);
  if (!m) return "#333333";
  return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}

function syncColorUi(pickerId, hexId, swatchId, color) {
  const picker = document.getElementById(pickerId);
  const hex = document.getElementById(hexId);
  const swatch = swatchId ? document.getElementById(swatchId) : null;
  const val = color || "";
  if (hex) hex.value = val;
  if (picker && val && /^#[0-9a-f]{6}$/i.test(val)) picker.value = val;
  if (swatch) {
    swatch.classList.toggle("empty", !val);
    if (val) swatch.style.background = val;
    else swatch.style.background = "";
  }
}

function parseLineHeight(cs) {
  const lh = cs.lineHeight;
  const fs = parseFloat(cs.fontSize) || 16;
  if (!lh || lh === "normal") return 1.5;
  if (String(lh).endsWith("px")) return Math.round((parseFloat(lh) / fs) * 100) / 100;
  const n = parseFloat(lh);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 1.5;
}

function formatLetterSpacing(px) {
  const n = Math.round(px * 10) / 10;
  return n === 0 ? "0" : `${n}px`;
}

function formatLineHeight(n) {
  return String(Math.round(n * 100) / 100);
}

function syncStyleInputs(el) {
  try {
    const cs = doc().defaultView.getComputedStyle(el);
    const size = document.getElementById("fontSize");
    if (!size) return;
    size.value = parseInt(cs.fontSize, 10) || 16;
    document.getElementById("fontWeight").value = ["300", "400", "600", "700"].includes(cs.fontWeight)
      ? cs.fontWeight
      : "400";
    syncColorUi("fontColor", "fontColorHex", "fontColorSwatch", rgbToHex(cs.color));
    const bg = isTransparentColor(cs.backgroundColor) ? "" : rgbToHex(cs.backgroundColor);
    syncColorUi("bgColor", "bgColorHex", "bgColorSwatch", bg);
    const fam = cs.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
    const select = document.getElementById("fontFamily");
    if (select && [...select.options].some((o) => o.value === fam || o.textContent === fam)) {
      select.value = fam;
    }
    const ls = parseFloat(cs.letterSpacing) || 0;
    const lsInput = document.getElementById("letterSpacing");
    const lsVal = document.getElementById("letterSpacingVal");
    if (lsInput) lsInput.value = String(ls);
    if (lsVal) lsVal.textContent = formatLetterSpacing(ls);
    const lh = parseLineHeight(cs);
    const lhInput = document.getElementById("lineHeight");
    const lhVal = document.getElementById("lineHeightVal");
    if (lhInput) lhInput.value = String(lh);
    if (lhVal) lhVal.textContent = formatLineHeight(lh);
    const block = movableBlock(el);
    const bwField = document.getElementById("blockWidthField");
    const bhField = document.getElementById("blockHeightField");
    const bwHint = document.getElementById("blockWidthHint");
    const canResize = block && isResizableBlock(block);
    if (bwField) bwField.style.display = canResize ? "" : "none";
    if (bhField) bhField.style.display = canResize ? "" : "none";
    if (bwHint) bwHint.hidden = !(block && blockSpansFullWidth(block));
    if (block && canResize) {
      syncBlockWidthUi(block);
      syncBlockHeightUi(block);
    }
    const align = cs.textAlign || "left";
    document.querySelectorAll("[data-align]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.align === align);
    });
    document.querySelectorAll("[data-cmd]").forEach((btn) => {
      const cmd = btn.dataset.cmd;
      let on = false;
      if (cmd === "bold") on = cs.fontWeight === "700" || cs.fontWeight === "bold" || Number(cs.fontWeight) >= 600;
      else if (cmd === "italic") on = cs.fontStyle === "italic";
      else if (cmd === "underline") on = (cs.textDecorationLine || "").includes("underline");
      btn.classList.toggle("active", on);
    });
  } catch {
    /* ignore missing style inputs */
  }
}

function snapshot() {
  if (skipNextSnapshot) {
    skipNextSnapshot = false;
    return;
  }
  const html = serialize();
  if (undoStack.length && undoStack[histIndex] === html) return;
  undoStack = undoStack.slice(0, histIndex + 1);
  undoStack.push(html);
  if (undoStack.length > 80) undoStack.shift();
  histIndex = undoStack.length - 1;
  scheduleSave();
}

function scheduleSnapshot() {
  clearTimeout(snapshotDebounceTimer);
  snapshotDebounceTimer = setTimeout(() => {
    snapshotDebounceTimer = null;
    snapshot();
  }, 450);
}

function flushPendingSnapshot() {
  if (snapshotDebounceTimer) {
    clearTimeout(snapshotDebounceTimer);
    snapshotDebounceTimer = null;
    snapshot();
  }
}

function ensureCurrentInHistory() {
  const html = serialize();
  if (!undoStack.length) {
    snapshot();
    return;
  }
  if (undoStack[histIndex] === html) return;
  undoStack = undoStack.slice(0, histIndex + 1);
  undoStack.push(html);
  if (undoStack.length > 80) undoStack.shift();
  histIndex = undoStack.length - 1;
  scheduleSave();
}

function withBase(html) {
  if (!/<base\s/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${location.origin}/">`);
  }
  const imports = [...html.matchAll(/@import url\(["']?(https:\/\/fonts\.googleapis\.com[^"')]+)["']?\)/gi)];
  const missing = [];
  for (const m of imports) {
    if (!html.includes(`href="${m[1]}"`)) missing.push(m[1]);
  }
  if (missing.length) {
    const links = missing.map((u) => `<link rel="stylesheet" href="${u}">`).join("");
    html = html.replace(/<head[^>]*>/i, (m) => m + links);
  }
  return html;
}

function restore(html) {
  pendingRestoreView = getViewAnchor();
  selected = null;
  selectedPage = null;
  skipNextSnapshot = true;
  frame.srcdoc = withBase(html);
}

function getViewAnchor() {
  const win = frame?.contentWindow;
  const pages = pageList();
  if (!win || !pages.length) return { pageIndex: 0, scrollY: 0 };
  const y = win.scrollY + 140;
  let active = 0;
  pages.forEach((p, i) => {
    if (p.offsetTop <= y) active = i;
  });
  return { pageIndex: active, scrollY: win.scrollY };
}

function applyPendingRestoreView() {
  const view = pendingRestoreView;
  if (!view) return;
  pendingRestoreView = null;
  const win = frame?.contentWindow;
  const pages = pageList();
  if (!win) return;
  const go = () => {
    const idx = Math.max(0, Math.min(view.pageIndex, Math.max(pages.length - 1, 0)));
    const page = pages[idx];
    if (page) page.scrollIntoView({ behavior: "auto", block: "start" });
    else win.scrollTo(0, view.scrollY || 0);
    syncActiveThumb();
    positionSelectionOverlay();
    positionPageOverlay();
  };
  requestAnimationFrame(() => requestAnimationFrame(go));
}

function tryNativeUndo() {
  const d = doc();
  if (!d) return false;
  try {
    return d.execCommand("undo");
  } catch {
    return false;
  }
}

function tryNativeRedo() {
  const d = doc();
  if (!d) return false;
  try {
    return d.execCommand("redo");
  } catch {
    return false;
  }
}

function doUndo() {
  flushPendingSnapshot();
  ensureCurrentInHistory();
  if (histIndex > 0) {
    histIndex -= 1;
    restore(undoStack[histIndex]);
    setSaveUi("Undone");
    return;
  }
  if (tryNativeUndo()) {
    scheduleSnapshot();
    setSaveUi("Undone");
    return;
  }
  setSaveUi("Nothing to undo");
}

function doRedo() {
  flushPendingSnapshot();
  ensureCurrentInHistory();
  if (histIndex < undoStack.length - 1) {
    histIndex += 1;
    restore(undoStack[histIndex]);
    setSaveUi("Redone");
    return;
  }
  if (tryNativeRedo()) {
    scheduleSnapshot();
    setSaveUi("Redone");
    return;
  }
  setSaveUi("Nothing to redo");
}

function handleUndoRedoKey(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
  const key = e.key.toLowerCase();
  if (key === "z" && !e.shiftKey) {
    e.preventDefault();
    doUndo();
    return true;
  }
  if (key === "y" || (key === "z" && e.shiftKey)) {
    e.preventDefault();
    doRedo();
    return true;
  }
  return false;
}

function updateEditedTime() {
  const el = document.getElementById("lastEdited");
  if (!el) return;
  const now = new Date();
  el.textContent =
    "Last edited: " +
    now.toLocaleDateString(undefined, { weekday: "short" }) +
    " at " +
    now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function setSaveUi(text) {
  if (saveState) saveState.textContent = text;
  const design = document.getElementById("saveStateDesign");
  if (design) design.textContent = text;
  const bottom = document.getElementById("saveStateBottom");
  if (bottom) bottom.textContent = text;
  const dock = document.getElementById("saveStateDock");
  if (dock) dock.textContent = text;
}

function setDocTitle(title) {
  const t = title || "Document";
  const el = document.getElementById("docTitle");
  if (el) el.textContent = t;
  const el2 = document.getElementById("docTitleDesign");
  if (el2) el2.textContent = t;
  const rt = document.getElementById("reviewDocTitle");
  if (rt) rt.textContent = t;
}

function setEditorMode(mode) {
  editorMode = mode;
  document.body.classList.toggle("mode-write", mode === "write");
  document.body.classList.toggle("mode-design", mode === "design");
  document.body.classList.toggle("mode-review", mode === "review");
  const rs = document.getElementById("reviewStage");
  if (rs) {
    rs.classList.toggle("hidden", mode !== "review");
    rs.setAttribute("aria-hidden", mode !== "review" ? "true" : "false");
  }
  // Map UI mode → URL stage (design editor still uses stage=design)
  if (mode === "write") syncEditorUrl("write");
  else if (mode === "review") syncEditorUrl("review");
  else if (mode === "design") syncEditorUrl(stage === "publish" ? "publish" : "design");
  positionSelectionOverlay();
}

function wrapManuscriptClient(inner, title) {
  const safe = (title || "Document").replace(/</g, "&lt;");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${safe}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style data-manuscript="1">html,body{margin:0;background:#fff;font-family:Inter,sans-serif;color:#1a2332;line-height:1.72;font-size:16px}body{max-width:720px;margin:0 auto;padding:56px 48px 96px}h1{font-size:32px;font-weight:700;margin:0 0 10px}h2{font-size:20px;font-weight:700;margin:28px 0 10px}h3{font-size:16px;font-weight:600;margin:20px 0 8px}p{margin:0 0 14px}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}th,td{border:1px solid #e5e7eb;padding:8px 10px}img{max-width:100%;height:auto}</style>
</head><body>${inner || "<h1>Untitled</h1><p>Start writing here.</p>"}</body></html>`;
}

function scheduleSave() {
  setSaveUi("Saving…");
  updateEditedTime();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 1400);
}

async function saveNow() {
  const html = serialize();
  const mode = editorMode === "write" || !templateApplied ? "draft" : "design";
  try {
    await fetch(`/api/jobs/${jobId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, mode }),
    });
    setSaveUi("Saved");
  } catch {
    setSaveUi("Save failed — will retry");
  }
}

function serialize() {
  const d = doc();
  const clone = d.documentElement.cloneNode(true);
  clone.querySelectorAll(".epdf-selected, .epdf-page-selected").forEach((n) => {
    n.classList.remove("epdf-selected", "epdf-page-selected");
  });
  clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
  clone.querySelectorAll(".epdf-handle").forEach((n) => n.remove());
  clone.querySelector("#epdf-sel-overlay")?.remove();
  clone.querySelector("#epdf-iframe-sel")?.remove();
  clone.querySelectorAll("[data-epdf-chrome]").forEach((n) => n.remove());
  clone.querySelectorAll(".epdf-col-selected").forEach((n) => n.classList.remove("epdf-col-selected"));
  clone.querySelectorAll(".epdf-dragging, .epdf-drop-line, .epdf-drop-page").forEach((n) => {
    n.classList.remove("epdf-dragging", "epdf-drop-line", "epdf-drop-page");
  });
  clone.removeAttribute("data-epdf-bound");
  clone.querySelector("#epdf-editor-css")?.remove();
  clone.querySelector("#epdf-layout-css")?.remove();
  return "<!DOCTYPE html>" + clone.outerHTML;
}

async function inlineImages(html) {
  const d = doc();
  const images = [...d.querySelectorAll("img")];
  const map = new Map();
  for (const img of images) {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) continue;
    if (map.has(src)) continue;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const data = await blobToData(blob);
      map.set(src, data);
    } catch {
      /* keep original src */
    }
  }
  let out = html;
  for (const [src, data] of map) {
    out = out.split(src).join(data);
  }
  return out;
}

function blobToData(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function bindFrame() {
  cleanupDragUi();
  const d = doc();
  if (!d || !d.body) return;
  if (d.documentElement.getAttribute("data-epdf-bound") === "1") {
    tidyDocument();
    enableEditing();
    pageList().forEach((p) => {
      if (pageLayoutCols(p) === 2) applyColumnWidths(p, readColumnLeftPct(p), { silent: true });
      clearPageWhitespaceBloat(p);
    });
    resizeFrame();
    buildPageNav();
    applyPendingRestoreView();
    positionSelectionOverlay();
    positionPageOverlay();
    positionColDivider();
    return;
  }
  d.documentElement.setAttribute("data-epdf-bound", "1");
  if (!d.getElementById("epdf-editor-css")) {
    const style = d.createElement("style");
    style.id = "epdf-editor-css";
    style.textContent = SELECT_CSS;
    d.head.appendChild(style);
  }
  if (!d.getElementById("epdf-layout-css")) {
    const layoutStyle = d.createElement("style");
    layoutStyle.id = "epdf-layout-css";
    layoutStyle.textContent = LAYOUT_CSS;
    d.head.appendChild(layoutStyle);
  }
  d.body.addEventListener("click", onClick);
  d.body.addEventListener("dblclick", onDblClick);
  d.addEventListener("keydown", onEditorKey);
  d.addEventListener("beforeinput", () => scheduleSnapshot());
  d.addEventListener("input", () => {
    scheduleSave();
    scheduleSnapshot();
    requestAnimationFrame(() => positionSelectionOverlay());
  });
  try {
    d.execCommand("defaultParagraphSeparator", false, "p");
  } catch {
    /* ignore */
  }
  bindDragDrop(d);
  bindIframeChrome();
  bindTableEdgeResize(d);
  d.querySelectorAll("img").forEach((img) => {
    img.setAttribute("draggable", "false");
    if (!img.complete) img.addEventListener("load", () => resizeFrame());
  });
  const cleaned = tidyDocument();
  decorateBlocks();
  normalizeColumnBlocks();
  renumberPages();
  enableEditing();
  doc()?.querySelectorAll(".epdf-col p, .epdf-col h1, .epdf-col h2, .epdf-col h3, .epdf-col h4, .epdf-col h5, .epdf-col h6, .epdf-col blockquote, .epdf-col ul, .epdf-col ol, .epdf-col .epdf-col-heading").forEach((el) => {
    if (el.closest("td, th, table")) return;
    // Leave explicit user widths alone — only normalize empty width
    if (!el.style.width || el.style.width === "auto") {
      el.style.width = "100%";
      el.style.maxWidth = "100%";
    }
  });
  pageList().forEach((p) => {
    if (!p.dataset.padTop) applyPagePadding(p, 72, 56, pageLayoutCols(p) === 2 ? 24 : 0);
    if (pageLayoutCols(p) === 2) applyColumnWidths(p, readColumnLeftPct(p), { silent: true });
    clearPageWhitespaceBloat(p);
  });
  resizeFrame();
  buildPageNav();
  fillMovePageGrid();
  requestAnimationFrame(() => resizeFrame());
  if (!undoStack.length) snapshot();
  scheduleSave();
  applyPendingRestoreView();
  positionPageOverlay();
  positionColDivider();
}

function bindIframeChrome() {
  const win = frame.contentWindow;
  if (!win || win.__epdfChrome) return;
  win.__epdfChrome = true;
  win.addEventListener("scroll", () => {
    syncActiveThumb();
    positionSelectionOverlay();
    positionPageOverlay();
    positionColDivider();
    positionColOverlay();
  }, { passive: true });
  win.addEventListener("resize", () => {
    positionSelectionOverlay();
    positionPageOverlay();
    positionColDivider();
    positionColOverlay();
  }, { passive: true });
  const host = overlayHost();
  const canvas = document.getElementById("canvas") || document.querySelector(".canvas");
  // Canvas is the scroll container; paper/overlays move with it via layout.
  // Keep listening on canvas (not paper) so overlays stay locked while scrolling.
  if (canvas && !canvas.__epdfScroll) {
    canvas.__epdfScroll = true;
    canvas.addEventListener("scroll", () => {
      positionSelectionOverlay();
      positionPageOverlay();
      positionColDivider();
      positionColOverlay();
    }, { passive: true });
  }
  if (host && host !== canvas && !host.__epdfScroll) {
    host.__epdfScroll = true;
    host.addEventListener("scroll", () => {
      positionSelectionOverlay();
      positionPageOverlay();
      positionColDivider();
      positionColOverlay();
    }, { passive: true });
  }
  if (!window.__epdfOverlayResize) {
    window.__epdfOverlayResize = true;
    window.addEventListener("resize", () => positionSelectionOverlay(), { passive: true });
  }
}

function goToPage(index) {
  const page = pageList()[index];
  if (!page) return;
  page.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncActiveThumb() {
  const d = doc();
  const nav = document.getElementById("pageNav");
  const win = frame.contentWindow;
  if (!d || !nav || !win) return;
  const pages = pageList();
  if (!pages.length) return;
  const y = win.scrollY + 140;
  let active = 0;
  pages.forEach((p, i) => {
    if (p.offsetTop <= y) active = i;
  });
  nav.querySelectorAll(".page-thumb").forEach((b, i) => {
    b.classList.toggle("on", i === active);
  });
}

function buildPageNav() {
  const nav = document.getElementById("pageNav");
  if (!nav || !doc()) return;
  const pages = pageList();
  const current = nav.querySelector(".page-thumb.on");
  const keep = current ? current.dataset.i : "0";
  nav.innerHTML = "";
  if (!pages.length) {
    nav.innerHTML = `<p class="muted tiny">Pages appear after you apply a template</p>`;
    updateDocMeta();
    return;
  }
  pages.forEach((page, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "page-thumb" + (String(i) === keep ? " on" : "");
    btn.dataset.i = String(i);
    const slot = document.createElement("div");
    slot.className = "page-thumb-slot";
    btn.appendChild(slot);
    const num = document.createElement("span");
    num.className = "page-num";
    num.textContent = String(i + 1);
    btn.appendChild(num);
    mountPageNavThumb(slot, page);
    btn.addEventListener("click", () => {
      nav.querySelectorAll(".page-thumb").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      goToPage(i);
      if (selectedPage) {
        doc()?.querySelectorAll(".epdf-page-selected").forEach((n) => n.classList.remove("epdf-page-selected"));
        selectedPage = null;
        positionPageOverlay();
      }
    });
    btn.addEventListener("dblclick", (ev) => {
      ev.preventDefault();
      if (editorMode === "design") markPageSelected(pages[i]);
    });
    btn.addEventListener("dragover", (e) => {
      e.preventDefault();
      btn.classList.add("drop-on");
    });
    btn.addEventListener("dragleave", () => btn.classList.remove("drop-on"));
    btn.addEventListener("drop", (e) => {
      e.preventDefault();
      btn.classList.remove("drop-on");
      const files = e.dataTransfer?.files;
      if (files && files.length) {
        insertImageFiles(files, pages[i]);
        return;
      }
      if (dragEl) {
        dragEl.classList.remove("epdf-dragging");
        moveBlockToPage(dragEl, i);
        dragEl = null;
        clearDropMarks();
      }
    });
    nav.appendChild(btn);
  });
  updateDocMeta();
}

function updateDocMeta() {
  const el = document.getElementById("docMeta");
  const el2 = document.getElementById("docMetaDesign");
  if (!doc()) return;
  const n = pageList().length;
  const tables = doc().querySelectorAll("table").length;
  const text = `${n} pages · ${tables} tables`;
  if (el) el.textContent = text;
  if (el2) el2.textContent = text;
}

function resizeFrame() {
  const d = doc();
  if (!d || !d.body) return;
  d.documentElement.style.height = "auto";
  d.body.style.height = "auto";
  d.documentElement.style.overflow = "auto";
  d.body.style.overflow = "auto";
  frame.style.height = "100%";
  positionSelectionOverlay();
  positionPageOverlay();
}

function pageList() {
  return doc() ? [...doc().querySelectorAll(".epdf-page")] : [];
}

function onEditorKey(e) {
  if (e.isComposing) return;
  if (handleUndoRedoKey(e)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveNow();
    return;
  }
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    const block = e.target.closest?.("p, h1, h2, h3, h4, h5, li, table, figure");
    if (block && !block.closest(".epdf-page-footer")) markSelected(block);
    pushFromHereToNextPage();
    return;
  }
  if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;
  const block = e.target.closest?.("p, h1, h2, h3, h4, h5, li");
  if (!block || block.closest(".epdf-page-footer") || block.closest("td, th")) return;
  e.preventDefault();
  insertParagraphLikeWord(block);
}

function isBlockEmpty(el) {
  if (!el) return true;
  const copy = el.cloneNode(true);
  copy.querySelectorAll(".epdf-handle").forEach((h) => h.remove());
  copy.querySelectorAll("br").forEach((br) => br.remove());
  const text = (copy.textContent || "").replace(/\s/g, "");
  return !text && !copy.querySelector("img, table, svg, video");
}

function deleteBlock(el) {
  el = movableBlock(el) || el;
  if (!el || !el.isConnected) return;
  if (el.classList.contains("epdf-page") || el.classList.contains("epdf-page-footer")) return;
  if (el.classList.contains("epdf-handle")) el = el.nextElementSibling || el;
  const page = el.closest(".epdf-page");
  let prev = skipHandle(el.previousElementSibling, -1);
  let next = skipHandle(el.nextElementSibling, 1);
  if (prev && prev.classList.contains("epdf-page-footer")) prev = null;
  if (next && next.classList.contains("epdf-page-footer")) next = null;
  el.remove();
  if (page && !pageHasContent(page)) {
    const p = doc().createElement("p");
    p.setAttribute("contenteditable", "true");
    p.innerHTML = "<br>";
    page.insertBefore(p, page.querySelector(".epdf-page-footer"));
    next = p;
  }
  decorateBlocks();
  enableEditing();
  const focus = (prev && prev.isConnected) ? prev : next;
  if (focus && focus.isConnected && !focus.classList.contains("epdf-page-footer")) {
    markSelected(focus.matches("img") ? focus : focus.querySelector?.("img") || focus);
    if (focus.matches("p, h1, h2, h3, h4, h5, li, figcaption")) placeCaret(focus, false);
  } else {
    markSelected(null);
  }
  snapshot();
  reflowFrom(page);
  resizeFrame();
  buildPageNav();
}

function isHeading(el) {
  return el && /^H[1-6]$/.test(el.tagName);
}

function skipHandle(node, dir) {
  let n = node;
  while (n && n.classList?.contains("epdf-handle")) {
    n = dir < 0 ? n.previousElementSibling : n.nextElementSibling;
  }
  return n;
}

function placeCaret(el, atStart) {
  const d = doc();
  el.setAttribute("contenteditable", "true");
  el.focus();
  const range = d.createRange();
  const sel = d.getSelection();
  if (atStart) {
    const handle = el.querySelector(":scope > .epdf-handle");
    if (handle && handle.nextSibling) range.setStart(handle.nextSibling, 0);
    else range.selectNodeContents(el);
    range.collapse(true);
  } else {
    range.selectNodeContents(el);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function extractAfterCaret(block) {
  const d = doc();
  const sel = d.getSelection();
  const frag = d.createDocumentFragment();
  if (!sel || !sel.rangeCount) return frag;
  const caret = sel.getRangeAt(0).cloneRange();
  caret.collapse(false);
  const rest = d.createRange();
  rest.selectNodeContents(block);
  rest.setStart(caret.endContainer, caret.endOffset);
  try {
    frag.appendChild(rest.extractContents());
  } catch {
    /* ignore */
  }
  frag.querySelectorAll?.(".epdf-handle").forEach((h) => h.remove());
  return frag;
}

function fragmentHasContent(frag) {
  return (frag.textContent || "").replace(/\u200B/g, "").trim().length > 0 || frag.querySelector?.("img, table, br");
}

function insertParagraphLikeWord(block) {
  const d = doc();
  const rest = extractAfterCaret(block);
  const neu = d.createElement(block.tagName === "LI" ? "li" : "p");
  neu.setAttribute("contenteditable", "true");
  if (fragmentHasContent(rest)) neu.appendChild(rest);
  else neu.appendChild(d.createElement("br"));
  block.insertAdjacentElement("afterend", neu);
  enableEditing();
  placeCaret(neu, true);
  markSelected(neu);
  snapshot();
}

function makeBlankPage(auto) {
  const d = doc();
  const section = d.createElement("section");
  section.className = "epdf-page";
  if (auto) section.setAttribute("data-epdf-auto", "1");
  const title = document.getElementById("docTitle")?.textContent || "";
  section.innerHTML =
    `<div class="epdf-page-footer"><span class="epdf-doc-title">${title}</span><span class="epdf-page-num"></span></div>`;
  return section;
}

function columnChildBlocks(col) {
  return [...(col?.children || [])].filter(
    (n) => n.tagName && !n.classList.contains("epdf-handle")
  );
}

function contentBlocks(page) {
  if (!page) return [];
  const footer = page.querySelector(".epdf-page-footer");
  const blocks = [];
  for (const child of [...page.children]) {
    if (!child.tagName || child === footer || child.classList.contains("epdf-handle")) continue;
    if (child.classList.contains("epdf-layout")) {
      // Newspaper reading order: LEFT column fully, then RIGHT column
      const cols = [...child.querySelectorAll(":scope > .epdf-col")];
      cols.sort((a, b) => Number(a.dataset.col || 0) - Number(b.dataset.col || 0));
      cols.forEach((col) => columnChildBlocks(col).forEach((b) => blocks.push(b)));
    } else {
      blocks.push(child);
    }
  }
  return blocks;
}

function estimateBlockHeight(block) {
  if (!block) return 48;
  const rectH = block.getBoundingClientRect?.()?.height || 0;
  if (rectH > 8) return rectH;
  const text = (block.textContent || "").trim();
  const lines = Math.max(1, Math.ceil(text.length / 52));
  if (block.matches?.("h1, h2, h3, h4, h5, h6, span.epdf-col-heading")) return 36 + lines * 22;
  if (block.matches?.("table")) return Math.max(120, (block.querySelectorAll("tr").length || 3) * 36);
  if (block.matches?.("figure, img")) return 180;
  if (block.matches?.("ul, ol")) return Math.max(48, (block.querySelectorAll("li").length || 2) * 28);
  return Math.max(40, lines * 26);
}

/** Newspaper/magazine split: fill LEFT column first, then RIGHT, balanced by height. */
function findColumnSplitIndex(blocks) {
  const n = blocks.length;
  if (n <= 1) return n;
  const heights = blocks.map(estimateBlockHeight);
  const total = heights.reduce((a, h) => a + h, 0);
  let best = Math.max(1, Math.ceil(n / 2));
  let bestDiff = Infinity;
  let leftSum = 0;
  for (let i = 1; i < n; i++) {
    leftSum += heights[i - 1];
    const diff = Math.abs(leftSum - (total - leftSum));
    // Prefer a real split into BOTH columns when content exists for the right side
    if (diff < bestDiff || (diff === bestDiff && i < best)) {
      bestDiff = diff;
      best = i;
    }
  }
  // Never leave the right column empty when there are 2+ blocks
  if (best >= n) best = n - 1;
  if (best < 1) best = 1;
  return best;
}

function distributeBlocksToColumns(blocks, col1, col2) {
  const flow = blocks.filter(Boolean);
  flow.forEach((b) => b.classList.remove("epdf-span-all"));
  const split = findColumnSplitIndex(flow);
  flow.slice(0, split).forEach((b) => col1.appendChild(b));
  flow.slice(split).forEach((b) => col2.appendChild(b));
}

function flattenPageBlocks(page) {
  if (!page) return [];
  const footer = page.querySelector(".epdf-page-footer");
  const blocks = contentBlocks(page);
  const layouts = [...page.querySelectorAll(":scope > .epdf-layout")];
  blocks.forEach((b) => {
    b.classList.remove("epdf-span-all");
    page.insertBefore(b, footer || null);
  });
  layouts.forEach((layout) => layout.remove());
  [...page.querySelectorAll(":scope > .epdf-col")].forEach((c) => {
    while (c.firstChild) page.insertBefore(c.firstChild, c);
    c.remove();
  });
  return blocks.filter((b) => b.isConnected && page.contains(b));
}

function createTwoColLayoutShell(page) {
  const d = doc() || page?.ownerDocument;
  if (!d) return null;
  const layout = d.createElement("div");
  layout.className = "epdf-layout epdf-layout-2col";
  const col1 = d.createElement("div");
  col1.className = "epdf-col";
  col1.setAttribute("data-col", "1");
  const col2 = d.createElement("div");
  col2.className = "epdf-col";
  col2.setAttribute("data-col", "2");
  layout.appendChild(col1);
  layout.appendChild(col2);
  return { layout, col1, col2 };
}

function isFullWidthBlock(el) {
  return blockSpansFullWidth(el);
}

function layoutSkipPages() {
  return 2;
}

function pagesForLayoutScope(cols, scope) {
  const all = pageList();
  if (scope !== "all") return [(selectedPage || currentPage())].filter(Boolean);
  if (cols === 2) return all.slice(layoutSkipPages());
  return all;
}

function pageLayoutCols(page) {
  if (!page) return 1;
  return page.querySelector(".epdf-layout-2col") ? 2 : 1;
}

function applyPageLayout(page, cols, opts = {}) {
  if (!page || !page.isConnected) return false;
  if (!doc()) return false;
  const footer = page.querySelector(".epdf-page-footer");
  const current = pageLayoutCols(page);
  const force = !!opts.force;

  if (cols === 1) {
    if (current === 1 && !force) return false;
    flattenPageBlocks(page);
    page.classList.remove("epdf-cols-2");
    page.removeAttribute("data-layout");
    page.removeAttribute("data-col-align");
    page.removeAttribute("data-col-flow");
    return true;
  }

  // Always flatten → then split left-then-right (newspaper flow, height-balanced)
  const blocks = flattenPageBlocks(page);
  page.querySelectorAll(":scope > .epdf-layout").forEach((n) => n.remove());
  const shell = createTwoColLayoutShell(page);
  if (!shell) return false;
  const { layout, col1, col2 } = shell;
  page.insertBefore(layout, footer || null);
  distributeBlocksToColumns(blocks, col1, col2);
  applyColumnWidths(page, readColumnLeftPct(page), { silent: true });

  const colW = col1.clientWidth || 0;
  if (colW > 40) {
    [...col1.children, ...col2.children].forEach((b) => {
      const w = parseInt(b.style?.width, 10);
      if (Number.isFinite(w) && w > colW + 8) {
        b.style.width = "100%";
        b.style.maxWidth = "100%";
        b.style.marginLeft = "";
      }
    });
  }

  page.classList.add("epdf-cols-2");
  page.setAttribute("data-layout", "2col");
  page.setAttribute("data-col-align", "justify");
  page.setAttribute("data-col-flow", "left-then-right");
  return true;
}

function insertTableBlock(table, page) {
  if (!table || !page) return;
  table.classList.add("epdf-table");
  table.style.width = "100%";
  table.style.maxWidth = "100%";
  table.style.tableLayout = "fixed";
  placeBlock(table, page, null);
  ensureColgroup(table);
}

function setBlockSpanFullWidth(block, spanAll) {
  if (!block) return;
  const page = block.closest(".epdf-page");
  if (!page || pageLayoutCols(page) !== 2) return;
  const layout = page.querySelector(".epdf-layout");
  if (!layout) return;
  if (spanAll) {
    block.classList.add("epdf-span-all");
    if (layout.contains(block)) page.insertBefore(block, layout);
    block.style.width = "100%";
    block.style.maxWidth = "100%";
    block.style.marginLeft = "";
  } else {
    block.classList.remove("epdf-span-all");
    if (!layout.contains(block)) {
      const target = pickShorterColumn(layout);
      if (target) target.appendChild(block);
    }
    ensureBlockWidth(block);
  }
  decorateBlocks();
  enableEditing();
  markSelected(block);
  snapshot();
  resizeFrame();
  refreshPageNavThumb(pageList().indexOf(page));
  syncLayoutBlockControls();
  positionSelectionOverlay();
}

function copyPagePadding(from, to) {
  if (!from || !to || from === to) return;
  const { top, sides } = readPagePadding(from);
  applyPagePadding(to, top, sides, 0);
}

function insertTablePage(rows = 5, cols = 4) {
  const ref = selectedPage || currentPage();
  const page = addPage(ref, { blank: true });
  if (!page) return null;
  copyPagePadding(ref, page);
  if (pageLayoutCols(page) === 2) applyPageLayout(page, 1);
  page.classList.add("epdf-table-page");
  page.classList.remove("title-page", "cover-page", "back-page");
  const wrap = doc().createElement("div");
  wrap.innerHTML = emptyTable(rows, cols);
  const table = wrap.firstElementChild;
  insertTableBlock(table, page);
  enableEditing();
  markSelected(table.querySelector("td, th") || table);
  syncTableColPanel(table.querySelector("td, th"));
  showPanel("table");
  snapshot();
  resizeFrame();
  buildPageNav();
  goToPage(pageList().indexOf(page));
  return page;
}

function makeTableFullPage() {
  const cell = tableCell();
  const table = cell ? tableOf(cell) : selectedEl()?.closest?.("table");
  if (!table) return;
  const page = table.closest(".epdf-page");
  if (!page) return;
  if (pageLayoutCols(page) === 2) applyPageLayout(page, 1);
  insertTableBlock(table, page);
  table.style.width = "100%";
  table.style.minHeight = table.style.minHeight || "60%";
  const th = document.getElementById("tableMinHeight");
  if (th) th.value = "60";
  const thVal = document.getElementById("tableMinHeightVal");
  if (thVal) thVal.textContent = "60%";
  page.classList.add("epdf-table-page");
  markSelected(table.querySelector("td, th") || table);
  syncTableColPanel(table.querySelector("td, th"));
  snapshot();
  resizeFrame();
  refreshPageNavThumb(pageList().indexOf(page));
  showPanel("table");
}

function clearBlockWhitespaceBloat(block) {
  if (!block || block.closest("td, th, table")) return;
  // Strip forced heights — these create huge empty white bands mid-page
  block.style.removeProperty("min-height");
  block.style.removeProperty("height");
  if (block.closest(".epdf-col")) {
    setBlockStyle(block, "width", "100%");
    setBlockStyle(block, "max-width", "100%");
    block.style.removeProperty("margin-left");
  }
}

function clearPageWhitespaceBloat(page) {
  if (!page) return;
  page.querySelectorAll("p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, .epdf-col-heading, figure").forEach(clearBlockWhitespaceBloat);
}

function reflowPageColumns(page) {
  if (!page?.classList?.contains("epdf-page")) return;
  clearPageWhitespaceBloat(page);
  applyPageLayout(page, 2, { force: true });
  // Prefer a tighter mid gap so columns don't look hollow
  const pad = readPagePadding(page);
  applyPagePadding(page, pad.top, pad.sides, Math.min(pad.gap || 36, 24));
  clearPageWhitespaceBloat(page);
  enableEditing();
  normalizeColumnBlocks();
  snapshot();
  resizeFrame();
  refreshPageNavThumb(pageList().indexOf(page));
  syncLayoutPanel();
  syncPagePaddingInputs();
  markSelected(null);
  positionSelectionOverlay();
  positionColDivider();
  setSaveUi("Columns reflowed — white space cleared");
}

function applyLayoutScope(cols, scope) {
  const pages = pagesForLayoutScope(cols, scope);
  if (!pages.length) {
    if (scope === "all" && cols === 2) {
      alert(`Pages 1–${layoutSkipPages()} stay single column. No other pages to update.`);
    } else {
      alert("No page selected. Click a page or text first, then apply layout.");
    }
    return;
  }
  let changed = false;
  pages.forEach((p) => {
    if (applyPageLayout(p, cols, { force: true })) changed = true;
  });
  if (!changed) {
    setSaveUi("Layout unchanged");
    return;
  }
  enableEditing();
  normalizeColumnBlocks();
  snapshot();
  resizeFrame();
  renumberPages();
  if (scope === "all") buildPageNav();
  else refreshPageNavThumbs(pages.map((p) => pageList().indexOf(p)));
  syncLayoutPanel();
  positionSelectionOverlay();
  positionPageOverlay();
  positionColDivider();
  setSaveUi(cols === 2 ? "2-column layout applied" : "1-column layout applied");
  if (selectedPage) showPanel("layout");
  else if (selectedEl()) showPanel("text");
}

function syncLayoutPanel() {
  const page = selectedPage || currentPage();
  const cols = page?.classList?.contains("epdf-page") ? pageLayoutCols(page) : 1;
  document.querySelectorAll("[data-layout-cols]").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.layoutCols) === cols);
  });
  layoutPickCols = cols;
  const hint = document.getElementById("layoutHint");
  const pageLabel = document.getElementById("layoutPageLabel");
  const idx = page ? pageList().indexOf(page) + 1 : 0;
  if (pageLabel && idx) pageLabel.textContent = `Page ${idx}`;
  if (hint) {
    hint.textContent =
      cols === 2
        ? "2-column flow: content fills the LEFT column top→bottom first, then continues in the RIGHT column (balanced by height). Use Reflow after edits. Apply-all skips pages 1–2."
        : "Single column — click text to edit formatting (bold, headings). Double-click page thumb for margins.";
  }
  syncPagePaddingInputs();
  syncColumnWidthInputs(page);
  syncLayoutBlockControls();
  positionColDivider();
}

function syncLayoutBlockControls() {
  const block = selectionBlock();
  const page = block?.closest(".epdf-page") || selectedPage || currentPage();
  const in2col = page && pageLayoutCols(page) === 2;
  const row = document.getElementById("layoutBlockWidthRow");
  if (row) row.hidden = !in2col || !block;
  const fullBtn = document.getElementById("blockFullWidth");
  const colBtn = document.getElementById("blockInColumn");
  const spans = block && blockSpansFullWidth(block);
  if (fullBtn) fullBtn.classList.toggle("active", !!spans);
  if (colBtn) colBtn.classList.toggle("active", !!block && !spans);
}

function nextEpdfPage(page) {
  let n = page.nextElementSibling;
  while (n && !n.classList?.contains("epdf-page")) n = n.nextElementSibling;
  return n && n.classList.contains("epdf-page") ? n : null;
}

function pageLimit(page) {
  return 920;
}

function scheduleReflow() {
  clearTimeout(reflowTimer);
  reflowTimer = setTimeout(() => {
    const page = selectedEl()?.closest(".epdf-page") || pageList()[0];
    reflowFrom(page);
    resizeFrame();
  }, 200);
}

function reflowPages() {
  reflowFrom(pageList()[0]);
}

function reflowFrom(startPage) {
  const d = doc();
  if (!d || !startPage || d.documentElement._epdfReflow) return;
  d.documentElement._epdfReflow = true;
  const before = pageList().length;
  try {
    let page = startPage.closest?.(".epdf-page") || startPage;
    let guard = 0;
    while (page && guard++ < 4) {
      pushOverflow(page);
      page = nextEpdfPage(page);
    }
    removeEmptyAutoPages();
    enableEditing();
    renumberPages();
    if (pageList().length !== before) buildPageNav();
  } finally {
    d.documentElement._epdfReflow = false;
  }
}

function pushOverflow(page) {
  let moved = false;
  let guard = 0;
  const limit = pageLimit(page);
  while (guard++ < 40) {
    const blocks = contentBlocks(page);
    if (blocks.length < 2) break;
    const last = blocks[blocks.length - 1];
    if (last.offsetTop + last.offsetHeight <= limit) break;
    let next = nextEpdfPage(page);
    if (!next) {
      next = makeBlankPage(true);
      page.insertAdjacentElement("afterend", next);
    }
    const destFirst = contentBlocks(next)[0];
    placeBlock(last, next, destFirst || next.querySelector(".epdf-page-footer"));
    moved = true;
  }
  return moved;
}

function pullFromNext(page) {
  if (page.getAttribute("data-epdf-keep") === "1") return false;
  const next = nextEpdfPage(page);
  if (!next) return false;
  let moved = false;
  let guard = 0;
  while (guard++ < 60) {
    const first = contentBlocks(next)[0];
    if (!first) break;
    const footer = page.querySelector(".epdf-page-footer");
    page.insertBefore(first, footer);
    const last = contentBlocks(page).at(-1);
    if (last && last.offsetTop + last.offsetHeight > pageLimit(page) - 12) {
      const nFirst = contentBlocks(next)[0];
      next.insertBefore(first, nFirst || next.querySelector(".epdf-page-footer"));
      break;
    }
    moved = true;
  }
  return moved;
}

function removeEmptyAutoPages() {
  let removed = false;
  pageList().forEach((page) => {
    if (page.getAttribute("data-epdf-auto") !== "1") return;
    if (pageList().length < 2) return;
    const real = contentBlocks(page).filter((b) => !isBlockEmpty(b));
    if (!real.length) {
      page.remove();
      removed = true;
    }
  });
  return removed;
}

function pageHasContent(page) {
  return [...page.children].some(
    (n) =>
      n.tagName &&
      !n.classList.contains("epdf-page-footer") &&
      !n.classList.contains("epdf-handle") &&
      (n.textContent || "").replace(/\s/g, "").length + (n.querySelector?.("img, table") ? 1 : 0) > 0
  );
}

function caretIsAtStart(block) {
  const d = doc();
  const sel = d.getSelection();
  if (!sel || !sel.rangeCount) return true;
  const caret = sel.getRangeAt(0).cloneRange();
  caret.collapse(true);
  const start = d.createRange();
  const handle = block.querySelector(":scope > .epdf-handle");
  if (handle) start.setStartAfter(handle);
  else {
    start.selectNodeContents(block);
    start.collapse(true);
  }
  try {
    return caret.compareBoundaryPoints(Range.START_TO_START, start) <= 0;
  } catch {
    return true;
  }
}

function makeHandle(d) {
  const h = d.createElement("span");
  h.className = "epdf-handle";
  h.setAttribute("contenteditable", "false");
  h.setAttribute("draggable", "true");
  h.title = "Drag to move";
  h.textContent = "⋮⋮";
  h.addEventListener("mousedown", (e) => e.stopPropagation());
  return h;
}

function enableEditing() {
  const d = doc();
  if (!d) return;
  d.querySelectorAll(".epdf-page").forEach((page) => page.removeAttribute("contenteditable"));
  d.querySelectorAll("p, h1, h2, h3, h4, h5, li, td, th, figcaption, blockquote, span.epdf-col-heading, div.callout, div.pull-quote").forEach((el) => {
    if (el.closest(".epdf-page-footer")) return;
    el.setAttribute("contenteditable", "true");
  });
  d.querySelectorAll("img").forEach((img) => img.setAttribute("draggable", "false"));
}

function tidyDocument() {
  const d = doc();
  if (!d) return false;
  let changed = false;
  d.querySelectorAll(".epdf-page").forEach((page) => {
    page.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
      const text = (h.textContent || "").replace(/\s/g, "");
      if (!text && !h.querySelector("img, table, svg")) {
        h.remove();
        changed = true;
      }
    });
    [...page.querySelectorAll("div")].forEach((div) => {
      if (
        div.classList.contains("epdf-page-footer") ||
        div.classList.contains("epdf-figure") ||
        div.classList.contains("epdf-layout") ||
        div.classList.contains("epdf-col")
      ) {
        return;
      }
      if (div.closest("table, figure")) return;
      const foot = div.querySelector(":scope > .epdf-page-footer");
      if (foot) page.appendChild(foot);
      const parent = div.parentElement;
      if (!parent) return;
      while (div.firstChild) parent.insertBefore(div.firstChild, div);
      div.remove();
      changed = true;
    });
  });
  return changed;
}

function decorateBlocks() {
  const d = doc();
  if (!d) return;
  d.querySelectorAll(".epdf-handle").forEach((h) => h.remove());
  enableEditing();
  positionSelectionOverlay();
}

function clearDropMarks() {
  const d = doc();
  if (!d) return;
  d.querySelectorAll(".epdf-drop-line, .epdf-drop-page").forEach((n) => {
    n.classList.remove("epdf-drop-line", "epdf-drop-page");
  });
}

function bindDragDrop(d) {
  d.addEventListener("dragstart", (e) => {
    if (e.target.closest?.("img") && !e.target.closest("td, th")) e.preventDefault();
  });
  d.addEventListener("dragover", (e) => {
    if ([...(e.dataTransfer?.types || [])].includes("Files")) e.preventDefault();
  });
  d.addEventListener("drop", (e) => {
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    e.preventDefault();
    insertImageFiles(files, e.target.closest(".epdf-page") || currentPage());
  });
}

function movableBlock(el) {
  if (!el || !el.closest) return null;
  if (el.classList.contains("epdf-handle")) el = el.nextElementSibling;
  if (!el || el.classList.contains("epdf-page-footer") || el.classList.contains("epdf-handle")) return null;
  if (el.closest(".epdf-page-footer")) return null;
  const fig = el.closest("figure");
  if (fig && fig.closest(".epdf-page")) return fig;
  const table = el.closest("table");
  if (table && table.closest(".epdf-page")) return table;
  if (el.matches(BLOCK_SEL)) return el;
  return el.closest(BLOCK_SEL);
}

function columnContentHeight(col) {
  return columnChildBlocks(col).reduce((sum, b) => sum + estimateBlockHeight(b), 0);
}

function pickShorterColumn(layout) {
  const cols = [...(layout?.querySelectorAll(".epdf-col") || [])];
  if (!cols.length) return null;
  if (cols.length === 1) return cols[0];
  const h0 = columnContentHeight(cols[0]);
  const h1 = columnContentHeight(cols[1]);
  // Prefer left until it is taller (newspaper: fill left first)
  return h0 <= h1 ? cols[0] : cols[1];
}

function placeBlock(el, page, before) {
  if (!el || !page) return;
  const footer = page.querySelector(".epdf-page-footer");
  const layout = page.querySelector(".epdf-layout");

  if (blockSpansFullWidth(el) && layout) {
    if (before && page.contains(before) && !before.classList.contains("epdf-page-footer")) {
      page.insertBefore(el, before);
    } else {
      page.insertBefore(el, layout);
    }
    return;
  }

  if (layout && before?.closest?.(".epdf-col") && layout.contains(before.closest(".epdf-col"))) {
    const container = before.parentElement;
    if (before.previousElementSibling?.classList.contains("epdf-handle")) {
      before.previousElementSibling.insertAdjacentElement("beforebegin", el);
    } else {
      container.insertBefore(el, before);
    }
    return;
  }

  if (layout && (!before || !page.contains(before) || before.classList?.contains("epdf-page-footer"))) {
    const targetCol = pickShorterColumn(layout);
    if (targetCol) targetCol.appendChild(el);
    else page.insertBefore(el, footer);
    return;
  }
  if (before && before !== el && page.contains(before) && !before.classList.contains("epdf-page-footer")) {
    const container = before.parentElement;
    if (before.previousElementSibling?.classList.contains("epdf-handle")) {
      before.previousElementSibling.insertAdjacentElement("beforebegin", el);
    } else {
      container.insertBefore(el, before);
    }
  } else if (footer) {
    page.insertBefore(el, footer);
  } else {
    page.appendChild(el);
  }
}

function fillMovePageGrid() {
  const grid = document.getElementById("movePageGrid");
  if (!grid) return;
  const pages = pageList();
  const cur = currentPage();
  const idx = pages.indexOf(cur);
  grid.innerHTML = "";
  if (!pages.length) {
    grid.innerHTML = "<span class='field-label'>No pages yet</span>";
    return;
  }
  pages.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(i + 1);
    btn.className = i === idx ? "on" : "";
    btn.title = "Move to page " + (i + 1);
    btn.addEventListener("click", () => {
      const el = movableBlock(selectedEl());
      if (!el) return;
      moveBlockToPage(el, i);
      fillMovePageGrid();
    });
    grid.appendChild(btn);
  });
}

function pageTopBlock(el) {
  const page = el && el.closest?.(".epdf-page");
  if (!page || !el) return el;
  let n = el;
  while (n.parentElement && n.parentElement !== page) n = n.parentElement;
  return n;
}

function blocksFromHere(el) {
  el = movableBlock(el) || el;
  const page = el && el.closest?.(".epdf-page");
  if (!page) return { page: null, blocks: [], start: el };
  const start = pageTopBlock(el);
  const blocks = [];
  let n = start;
  while (n) {
    const next = n.nextElementSibling;
    if (!n.classList?.contains("epdf-page-footer") && !n.classList?.contains("epdf-handle")) {
      blocks.push(n);
    }
    n = next;
  }
  return { page, blocks, start };
}

function moveBlockToPage(el, pageIndex, opts = {}) {
  el = movableBlock(el) || el;
  const pages = pageList();
  const dest = pages[pageIndex];
  if (!dest || !el) return;
  const srcIdx = pageIndexOf(el);
  const srcPage = el.closest(".epdf-page");
  if (dest === srcPage) {
    const first = contentBlocks(dest).find((b) => b !== el);
    if (first) placeBlock(el, dest, first);
  } else {
    placeBlock(el, dest, contentBlocks(dest)[0] || dest.querySelector(".epdf-page-footer"));
  }
  enableEditing();
  markSelected(el);
  snapshot();
  decorateBlocks();
  resizeFrame();
  renumberPages();
  if (!opts.skipNav) {
    refreshPageNavThumbs([srcIdx, pageIndex]);
    goToPage(pageIndex);
  }
}

function pushFromHereToNextPage() {
  const el = selectedEl() || doc()?.getSelection()?.anchorNode?.parentElement;
  const { page, blocks, start } = blocksFromHere(el);
  if (!page || !blocks.length) {
    alert("Select a heading first, then use Move down or Page down.");
    return;
  }
  const dest = makeBlankPage(false);
  dest.setAttribute("data-epdf-keep", "1");
  page.insertAdjacentElement("afterend", dest);
  const frag = doc().createDocumentFragment();
  blocks.forEach((node) => frag.appendChild(node));
  dest.insertBefore(frag, dest.querySelector(".epdf-page-footer"));
  if (!pageHasContent(page)) {
    const p = doc().createElement("p");
    p.setAttribute("contenteditable", "true");
    p.innerHTML = "<br>";
    page.insertBefore(p, page.querySelector(".epdf-page-footer"));
  }
  enableEditing();
  markSelected(start);
  renumberPages();
  snapshot();
  resizeFrame();
  buildPageNav();
  goToPage(pageList().indexOf(dest));
}

function moveBlock(dir) {
  const el = movableBlock(selectedEl());
  if (!el) return;
  const page = el.closest(".epdf-page");
  const blocks = contentBlocks(page);
  const idx = blocks.indexOf(el);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= blocks.length) return;
  const sib = blocks[newIdx];
  if (dir < 0) sib.parentElement.insertBefore(el, sib);
  else sib.insertAdjacentElement("afterend", el);
  markSelected(el);
  snapshot();
  decorateBlocks();
  resizeFrame();
  positionSelectionOverlay();
}

function addPage(afterPage, opts = {}) {
  const d = doc();
  if (!d || !d.body) return;
  const section = d.createElement("section");
  section.className = "epdf-page";
  section.setAttribute("data-epdf-keep", "1");
  const footer =
    "<div class='epdf-page-footer'><span class='epdf-doc-title'></span><span class='epdf-page-num'></span></div>";
  section.innerHTML = opts.blank
    ? footer
    : "<h2>New page</h2><p>Type your text here.</p>" + footer;
  const pages = pageList();
  let current = afterPage;
  if (!current || !current.classList?.contains("epdf-page")) {
    const sel = selectedEl();
    current = (sel && sel.closest(".epdf-page")) || pages[pages.length - 1];
  }
  if (current && current.classList.contains("epdf-page")) current.insertAdjacentElement("afterend", section);
  else (d.querySelector("[data-epdf-slot]") || d.body).appendChild(section);
  if (!opts.blank) {
    enableEditing();
    renumberPages();
    markSelected(section.querySelector("h2") || section.querySelector("p"));
    snapshot();
    resizeFrame();
    buildPageNav();
    goToPage(pageList().indexOf(section));
  } else {
    renumberPages();
  }
  return section;
}

function duplicatePage() {
  const page = selectedPage || currentPage();
  if (!page || !page.classList.contains("epdf-page")) return;
  const copy = page.cloneNode(true);
  copy.querySelectorAll(".epdf-selected, .epdf-handle").forEach((n) => {
    if (n.classList.contains("epdf-handle")) n.remove();
    else n.classList.remove("epdf-selected");
  });
  copy.classList.remove("epdf-page-selected");
  page.insertAdjacentElement("afterend", copy);
  renumberPages();
  decorateBlocks();
  snapshot();
  resizeFrame();
  buildPageNav();
  markPageSelected(copy);
}

function deleteCurrentPage() {
  const pages = pageList();
  const page = selectedPage || currentPage();
  if (!page || pages.length < 2) {
    alert("You cannot delete the last page.");
    return;
  }
  const i = pages.indexOf(page);
  selectedPage = null;
  page.remove();
  markSelected(null);
  renumberPages();
  snapshot();
  resizeFrame();
  buildPageNav();
  positionPageOverlay();
  goToPage(Math.max(0, i - 1));
  markPageSelected(pageList()[Math.max(0, i - 1)]);
}

function shiftPage(dir) {
  const page = selectedPage || currentPage();
  const pages = pageList();
  if (!page) return;
  const i = pages.indexOf(page);
  const j = i + dir;
  if (j < 0 || j >= pages.length) return;
  if (dir < 0) pages[j].insertAdjacentElement("beforebegin", page);
  else pages[j].insertAdjacentElement("afterend", page);
  renumberPages();
  snapshot();
  resizeFrame();
  buildPageNav();
  goToPage(j);
  markPageSelected(page);
}

function renumberPages() {
  const title = document.getElementById("docTitle")?.textContent || "";
  const pages = pageList();
  const last = pages.length - 1;
  pages.forEach((p, i) => {
    p.setAttribute("data-page", String(i + 1));
    const num = p.querySelector(".epdf-page-num");
    if (num) num.textContent = String(i + 1);
    const run = p.querySelector(".epdf-doc-title");
    if (run && !run.textContent.trim()) run.textContent = title;

    p.classList.remove("title-page", "cover-page", "back-page");
    if (i === 0) {
      p.classList.add("title-page", "cover-page");
      p.setAttribute("data-page-label", "Cover");
    } else if (i === last && last > 0) {
      p.classList.add("back-page");
      p.setAttribute("data-page-label", "Back");
    } else if (!p.getAttribute("data-page-label") || p.getAttribute("data-page-label") === "Cover" || p.getAttribute("data-page-label") === "Back") {
      p.setAttribute("data-page-label", p.classList.contains("chapter-page") ? "Chapter" : "Inside");
    }
  });
  fillMovePageGrid();
}

async function insertImageFiles(fileList, page) {
  const files = [...fileList].filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  const dest = page && page.classList?.contains("epdf-page") ? page : currentPage();
  let last = selectedEl();
  for (const file of files) {
    const data = await blobToData(file);
    const wrap = doc().createElement("div");
    wrap.innerHTML = `<figure class="epdf-figure"><img src="${data}" alt=""></figure>`;
    const node = wrap.firstElementChild;
    if (replaceImage) {
      const img = selectedEl()?.closest?.("figure") || selectedEl();
      if (img && (img.matches("figure, img"))) {
        const wasFree = img.classList?.contains("epdf-free-pos") || img.closest?.("figure")?.classList?.contains("epdf-free-pos");
        const oldFig = img.matches("figure") ? img : img.closest("figure");
        if (wasFree && oldFig) {
          node.classList.add("epdf-free-pos");
          node.style.cssText = oldFig.style.cssText;
        }
        img.replaceWith(node);
        replaceImage = false;
        last = node;
        continue;
      }
      replaceImage = false;
    }
    placeBlock(node, dest, last && dest.contains(last) ? last.nextElementSibling : null);
    last = node;
  }
  markSelected(last?.querySelector("img") || last);
  snapshot();
  decorateBlocks();
  resizeFrame();
  buildPageNav();
  showPanel("image");
}

function onClick(e) {
  if (editorMode !== "design") return;
  const t = clickTargetEl(e);
  if (!t || t.closest(".epdf-page-footer")) return;

  // Alt / Ctrl / Meta + click → select the whole left/right column
  if (e.altKey || e.ctrlKey || e.metaKey) {
    const col = t.closest(".epdf-col");
    if (col) {
      markColSelected(col);
      return;
    }
  }

  const el = editableTargetFromEvent(e);
  if (el) {
    if (selectedPage) {
      doc()?.querySelectorAll(".epdf-page-selected").forEach((n) => n.classList.remove("epdf-page-selected"));
      selectedPage = null;
      positionPageOverlay();
    }
    markSelected(pickSelection(el, t));
    if (el.closest("table") && !el.closest("figure")) showPanel("table");
    else if (el.closest("img, figure")) showPanel("image");
    else showPanel("text");
    return;
  }

  // Click empty area of a column (not on text) → select that column
  const col = t.classList?.contains("epdf-col")
    ? t
    : t.closest?.(".epdf-col");
  if (col) {
    markColSelected(col);
    return;
  }

  // Click the 2-col layout gap / shell → select nearest column (viewport coords)
  if (t.classList?.contains("epdf-layout") || t.classList?.contains("epdf-layout-2col")) {
    const cols = [...t.querySelectorAll(":scope > .epdf-col")];
    if (cols.length) {
      const mid = cols[0].getBoundingClientRect().right;
      markColSelected(e.clientX > mid ? cols[1] || cols[0] : cols[0]);
    }
  }
}

function onDblClick(e) {
  const t = clickTargetEl(e);
  const el = editableTargetFromEvent(e);
  if (!el || t?.closest(".epdf-page-footer")) return;
  markSelected(pickSelection(el, t));
  showPanel("text");
}

function applyStyle(prop, value) {
  const block = selectionBlock() || selectedEl();
  if (!block) return;
  setBlockStyle(block, prop, value);
  syncStyleInputs(block);
  positionSelectionOverlay();
  snapshot();
}

function setPropPanelCollapsed(collapsed) {
  document.body.classList.toggle("prop-panel-collapsed", collapsed);
  const edge = document.getElementById("panelEdgeToggle");
  if (edge) {
    edge.textContent = collapsed ? "›" : "‹";
    edge.title = collapsed ? "Show editor panel" : "Hide editor panel";
  }
  try {
    localStorage.setItem("epdf-prop-panel-collapsed", collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    positionSelectionOverlay();
    positionPageOverlay();
  }, collapsed ? 260 : 280);
}

function togglePropPanel() {
  setPropPanelCollapsed(!document.body.classList.contains("prop-panel-collapsed"));
}

function showPanel(id) {
  if (document.body.classList.contains("prop-panel-collapsed")) {
    setPropPanelCollapsed(false);
  }
  if (id !== "layout" && selectedPage) {
    doc()?.querySelectorAll(".epdf-page-selected").forEach((n) => n.classList.remove("epdf-page-selected"));
    selectedPage = null;
    positionPageOverlay();
  }
  if (id === "layout") syncLayoutPanel();
  document.querySelectorAll(".tool-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.panel === id);
  });
  document.querySelectorAll(".rail-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.panel === id);
  });
  document.querySelectorAll(".panel-block").forEach((p) => {
    p.classList.toggle("hidden", p.dataset.view !== id);
  });
}

document.querySelectorAll(".tool-tab").forEach((btn) => {
  btn.addEventListener("click", () => showPanel(btn.dataset.panel));
});

document.getElementById("fontFamily").addEventListener("change", (e) => applyStyle("fontFamily", e.target.value));
document.getElementById("fontWeight").addEventListener("change", (e) => applyStyle("fontWeight", e.target.value));
document.getElementById("fontSize").addEventListener("input", (e) => applyStyle("fontSize", e.target.value + "px"));
document.getElementById("fontColor").addEventListener("input", (e) => {
  syncColorUi("fontColor", "fontColorHex", "fontColorSwatch", e.target.value);
  applyStyle("color", e.target.value);
});
document.getElementById("fontColorHex").addEventListener("change", (e) => {
  let v = e.target.value.trim();
  if (!v.startsWith("#")) v = "#" + v;
  if (!/^#[0-9a-f]{6}$/i.test(v)) return;
  syncColorUi("fontColor", "fontColorHex", "fontColorSwatch", v);
  applyStyle("color", v);
});
document.getElementById("bgColor").addEventListener("input", (e) => {
  syncColorUi("bgColor", "bgColorHex", "bgColorSwatch", e.target.value);
  applyStyle("backgroundColor", e.target.value);
});
document.getElementById("bgColorHex").addEventListener("change", (e) => {
  const raw = e.target.value.trim();
  if (!raw) {
    syncColorUi("bgColor", "bgColorHex", "bgColorSwatch", "");
    applyStyle("backgroundColor", "");
    return;
  }
  let v = raw.startsWith("#") ? raw : "#" + raw;
  if (!/^#[0-9a-f]{6}$/i.test(v)) return;
  syncColorUi("bgColor", "bgColorHex", "bgColorSwatch", v);
  applyStyle("backgroundColor", v);
});
document.getElementById("bgColorClear").addEventListener("click", () => {
  syncColorUi("bgColor", "bgColorHex", "bgColorSwatch", "");
  applyStyle("backgroundColor", "");
});
document.getElementById("letterSpacing").addEventListener("input", (e) => {
  const v = parseFloat(e.target.value) || 0;
  const el = document.getElementById("letterSpacingVal");
  if (el) el.textContent = formatLetterSpacing(v);
  applyStyle("letterSpacing", v + "px");
});
document.getElementById("lineHeight").addEventListener("input", (e) => {
  const v = parseFloat(e.target.value) || 1.5;
  const el = document.getElementById("lineHeightVal");
  if (el) el.textContent = formatLineHeight(v);
  applyStyle("lineHeight", String(v));
});
document.getElementById("blockWidth").addEventListener("input", (e) => {
  const block = selectionBlock();
  if (!block || !isResizableBlock(block)) return;
  applyBlockWidth(block, parseInt(e.target.value, 10) || 100);
  positionSelectionOverlay();
});
document.getElementById("blockWidth").addEventListener("change", () => snapshot());
document.getElementById("blockHeight")?.addEventListener("input", (e) => {
  const block = selectionBlock();
  if (!block || !isResizableBlock(block)) return;
  applyBlockHeight(block, parseInt(e.target.value, 10) || 0);
});
document.getElementById("blockHeight")?.addEventListener("change", () => snapshot());

document.querySelectorAll("[data-cmd]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const el = selectedEl();
    if (!el) return;
    const cmd = btn.dataset.cmd;
    if (cmd === "uppercase") {
      const isUpper = el.style.textTransform === "uppercase";
      el.style.textTransform = isUpper ? "none" : "uppercase";
    } else {
      el.setAttribute("contenteditable", "true");
      el.focus();
      doc().execCommand(cmd, false, null);
    }
    snapshot();
    syncStyleInputs(el);
  });
});

document.querySelectorAll("[data-align]").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyStyle("textAlign", btn.dataset.align);
    document.querySelectorAll("[data-align]").forEach((b) => b.classList.toggle("active", b === btn));
  });
});

function currentPage() {
  if (selectedPage?.isConnected) return selectedPage;
  const el = selectedEl();
  const page = (el && el.closest(".epdf-page")) || doc().querySelector(".epdf-page.epdf-drop-page");
  if (page) return page;
  const nav = document.getElementById("pageNav");
  const on = nav?.querySelector(".page-thumb.on");
  if (on) return pageList()[+on.dataset.i] || pageList()[0];
  return pageList()[0] || doc().querySelector("[data-epdf-slot]") || doc().body;
}

function insertNode(html) {
  const wrap = doc().createElement("div");
  wrap.innerHTML = html;
  const node = wrap.firstElementChild;
  const page = currentPage();
  if (node.matches("table")) {
    insertTableBlock(node, page);
  } else {
    const el = movableBlock(selectedEl());
    placeBlock(node, page, el ? el.nextElementSibling : null);
  }
  decorateBlocks();
  markSelected(node.matches("table") ? node.querySelector("td, th") || node : node);
  if (node.matches("table")) {
    syncTableColPanel(node.querySelector("td, th"));
    showPanel("table");
  }
  reflowFrom(page && page.closest ? page.closest(".epdf-page") || page : page);
  snapshot();
  resizeFrame();
  buildPageNav();
  return node;
}

document.querySelectorAll("[data-insert]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const kind = btn.dataset.insert;
    if (kind === "heading") insertNode("<h2>Chapter heading</h2>");
    if (kind === "text") insertNode("<p>Type your text here.</p>");
    if (kind === "pagebreak" || kind === "page") addPage();
    if (kind === "table") insertNode(emptyTable(3, 3));
    if (kind === "tablepage") insertTablePage(5, 4);
    if (kind === "image") {
      replaceImage = false;
      document.getElementById("imageFile").click();
    }
  });
});

function emptyTable(rows, cols) {
  let head = "<thead><tr>" + "<th>Header</th>".repeat(cols) + "</tr></thead><tbody>";
  for (let r = 0; r < rows; r++) {
    head += "<tr>" + "<td>Cell</td>".repeat(cols) + "</tr>";
  }
  return `<table class="epdf-table epdf-table-full" style="width:100%;max-width:100%;table-layout:fixed">${head}</tbody></table>`;
}

document.getElementById("imageFile").addEventListener("change", async (e) => {
  const files = e.target.files;
  if (!files?.length) return;
  await insertImageFiles(files, currentPage());
  e.target.value = "";
});

function tableCell() {
  const el = selectedEl();
  return el && el.closest("td, th");
}

function tableOf(cell) {
  return cell && cell.closest("table");
}

function rowIndex(cell) {
  return cell.parentElement.rowIndex;
}

function cellIndex(cell) {
  return cell.cellIndex;
}

document.getElementById("rowAbove").addEventListener("click", () => insertRow(0));
document.getElementById("rowBelow").addEventListener("click", () => insertRow(1));
document.getElementById("colLeft").addEventListener("click", () => insertCol(0));
document.getElementById("colRight").addEventListener("click", () => insertCol(1));
document.getElementById("delRow").addEventListener("click", deleteRow);
document.getElementById("delCol").addEventListener("click", deleteCol);
document.getElementById("toggleHead").addEventListener("click", toggleHead);
document.querySelectorAll("[data-delete-block]").forEach((btn) => {
  btn.addEventListener("click", () => deleteBlock(movableBlock(selectedEl()) || selectedEl()));
});
document.getElementById("addPageBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  addPage();
});
document.getElementById("dupPage").addEventListener("click", duplicatePage);
document.getElementById("deletePage").addEventListener("click", deleteCurrentPage);
document.getElementById("moveUp").addEventListener("click", () => moveBlock(-1));
document.getElementById("moveDown").addEventListener("click", () => moveBlock(1));
document.getElementById("pageUp").addEventListener("click", () => shiftPage(-1));
document.getElementById("pageDown").addEventListener("click", () => pushFromHereToNextPage());
document.getElementById("pushNextPage")?.addEventListener("click", () => pushFromHereToNextPage());

document.addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea, select") && !e.target.closest?.("#frame, .canvas")) {
    return;
  }
  handleUndoRedoKey(e);
}, true);

async function doPublish() {
  if (!templateApplied) {
    alert("Choose a book format and template before publishing.");
    openFormatStage();
    return;
  }
  setSaveUi("Publishing…");
  const html = await inlineImages(serialize());
  const res = await fetch(`/api/jobs/${jobId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    setSaveUi(err.detail || "Publish failed");
    alert(err.detail || "Publish failed. Chrome or Edge is required to create the PDF.");
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (document.getElementById("docTitle")?.textContent || document.getElementById("docTitleDesign")?.textContent || "ebook") + ".pdf";
  a.click();
  URL.revokeObjectURL(url);
  setSaveUi("Published");
  markFlow(5);
}

function selectedImage() {
  const el = selectedEl();
  if (!el) return null;
  if (el.tagName === "IMG") return el;
  return el.querySelector?.("img") || el.closest?.("figure")?.querySelector("img") || null;
}

function ensureColgroup(table) {
  const d = doc();
  let cg = table.querySelector("colgroup");
  const colCount = table.rows[0]?.cells.length || 0;
  if (!colCount) return null;
  if (!cg) {
    cg = d.createElement("colgroup");
    for (let i = 0; i < colCount; i++) cg.appendChild(d.createElement("col"));
    table.insertBefore(cg, table.firstChild);
  } else {
    while (cg.children.length < colCount) cg.appendChild(d.createElement("col"));
    while (cg.children.length > colCount) cg.lastElementChild.remove();
  }
  return cg;
}

function getColPercents(table) {
  const cg = ensureColgroup(table);
  if (!cg) return [];
  const n = cg.children.length;
  const widths = [...cg.children].map((col, i) => {
    const w = col.style.width;
    if (w && w.includes("%")) return parseFloat(w);
    const cell = table.rows[0]?.cells[i];
    if (cell?.style.width?.includes("%")) return parseFloat(cell.style.width);
    return Math.round(100 / n);
  });
  const sum = widths.reduce((a, b) => a + b, 0) || 100;
  if (Math.abs(sum - 100) > 2) return widths.map(() => Math.round(100 / n));
  return widths;
}

function setColPercent(table, colIndex, pct) {
  const cg = ensureColgroup(table);
  if (!cg) return;
  const n = cg.children.length;
  pct = Math.max(8, Math.min(75, pct));
  let widths = getColPercents(table);
  if (!widths.length) widths = Array(n).fill(Math.round(100 / n));
  const remain = 100 - pct;
  const others = widths.filter((_, i) => i !== colIndex);
  const otherSum = others.reduce((a, b) => a + b, 0) || 1;
  widths[colIndex] = pct;
  let oi = 0;
  for (let i = 0; i < n; i++) {
    if (i === colIndex) continue;
    widths[i] = Math.max(8, Math.round((others[oi++] / otherSum) * remain));
  }
  let total = widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.round((w / total) * 100));
  [...cg.children].forEach((col, i) => {
    col.style.width = widths[i] + "%";
  });
  [...table.rows].forEach((row) => {
    [...row.cells].forEach((cell, i) => {
      if (widths[i]) cell.style.width = widths[i] + "%";
    });
  });
  table.style.tableLayout = "fixed";
}

function syncTableColPanel(el) {
  const panel = document.getElementById("tableColPanel");
  const container = document.getElementById("tableColSliders");
  const tw = document.getElementById("tableWidth");
  const twVal = document.getElementById("tableWidthVal");
  const tmh = document.getElementById("tableMinHeight");
  const tmhVal = document.getElementById("tableMinHeightVal");
  const rowField = document.getElementById("tableRowHeightField");
  const rowInput = document.getElementById("tableRowHeight");
  const rowVal = document.getElementById("tableRowHeightVal");
  if (!panel || !container) return;
  const cell = el?.closest?.("td, th");
  const table = cell ? tableOf(cell) : el?.closest?.("table") || (el?.matches?.("table") ? el : null);
  if (!table) {
    panel.classList.add("hidden");
    if (rowField) rowField.hidden = true;
    return;
  }
  panel.classList.remove("hidden");
  const widths = getColPercents(table);
  container.innerHTML = "";
  widths.forEach((pct, i) => {
    const wrap = document.createElement("div");
    wrap.className = "slider-field compact";
    wrap.innerHTML =
      `<div class="slider-head"><span>Column ${i + 1}</span>` +
      `<span class="slider-val" data-col-val="${i}">${pct}%</span></div>` +
      `<input type="range" min="8" max="75" step="1" value="${pct}" data-col-idx="${i}">`;
    wrap.querySelector("input").addEventListener("input", (e) => {
      const idx = +e.target.dataset.colIdx;
      const v = +e.target.value;
      wrap.querySelector("[data-col-val]").textContent = v + "%";
      setColPercent(table, idx, v);
      syncTableColPanel(selectedEl());
    });
    wrap.querySelector("input").addEventListener("change", () => snapshot());
    container.appendChild(wrap);
  });
  let pct = 100;
  if (table.style.width?.includes("%")) pct = parseInt(table.style.width, 10) || 100;
  else {
    const box = blockWidthContainer(table);
    if (box?.clientWidth) pct = Math.round((table.getBoundingClientRect().width / box.clientWidth) * 100);
  }
  if (tw) tw.value = String(Math.min(100, Math.max(40, pct)));
  if (twVal) twVal.textContent = tw.value + "%";
  let minH = 0;
  if (table.style.minHeight?.includes("%")) minH = parseInt(table.style.minHeight, 10) || 0;
  if (tmh) tmh.value = String(minH);
  if (tmhVal) tmhVal.textContent = minH ? minH + "%" : "Auto";

  if (rowField && rowInput) {
    if (cell?.parentElement) {
      rowField.hidden = false;
      const h = parseInt(cell.parentElement.style.height || cell.style.height, 10) || 0;
      rowInput.value = String(h);
      if (rowVal) rowVal.textContent = h ? h + "px" : "Auto";
    } else {
      rowField.hidden = true;
    }
  }
}

function applySelectedRowHeight(px) {
  const cell = tableCell();
  const row = cell?.parentElement;
  if (!row || row.tagName !== "TR") return;
  if (px <= 0) {
    row.style.height = "";
    [...row.cells].forEach((c) => {
      c.style.height = "";
      c.style.minHeight = "";
    });
  } else {
    const h = Math.max(24, Math.round(px));
    row.style.height = h + "px";
    [...row.cells].forEach((c) => {
      c.style.height = h + "px";
      c.style.minHeight = h + "px";
      c.style.verticalAlign = "top";
    });
  }
  positionSelectionOverlay();
}

/** Drag column / row edges directly on the table. */
function bindTableEdgeResize(d) {
  if (!d || d.documentElement.dataset.epdfTableResize === "1") return;
  d.documentElement.dataset.epdfTableResize = "1";
  d.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const cell = e.target?.closest?.("td, th");
    if (!cell) return;
    const table = cell.closest("table");
    if (!table) return;
    const rect = cell.getBoundingClientRect();
    const nearRight = e.clientX >= rect.right - 8;
    const nearBottom = e.clientY >= rect.bottom - 8;
    if (!nearRight && !nearBottom) return;
    e.preventDefault();
    e.stopPropagation();
    markSelected(cell);
    showPanel("table");
    if (nearRight) {
      startTableColEdgeResize(e, table, cell.cellIndex);
    } else {
      startTableRowEdgeResize(e, cell.parentElement);
    }
  }, true);
  d.addEventListener("mousemove", (e) => {
    const cell = e.target?.closest?.("td, th");
    if (!cell || document.body.classList.contains("epdf-resizing-table-col") || document.body.classList.contains("epdf-resizing-table-row")) {
      return;
    }
    const rect = cell.getBoundingClientRect();
    if (e.clientX >= rect.right - 8) cell.style.cursor = "col-resize";
    else if (e.clientY >= rect.bottom - 8) cell.style.cursor = "row-resize";
    else cell.style.cursor = "";
  }, true);
}

function startTableColEdgeResize(e, table, colIndex) {
  ensureColgroup(table);
  const widths = getColPercents(table);
  const startX = e.clientX;
  const startPct = widths[colIndex] || Math.round(100 / widths.length);
  document.body.classList.add("epdf-resizing-table-col");
  setFramePointerPassThrough(true);
  const onMove = (ev) => {
    const dx = ev.clientX - startX;
    const tableW = table.getBoundingClientRect().width || 1;
    const deltaPct = (dx / tableW) * 100;
    setColPercent(table, colIndex, startPct + deltaPct);
    syncTableColPanel(selectedEl());
    positionSelectionOverlay();
  };
  const onUp = () => {
    unbind();
    document.body.classList.remove("epdf-resizing-table-col");
    setFramePointerPassThrough(false);
    snapshot();
  };
  const unbind = bindDragTracking(onMove, onUp);
}

function startTableRowEdgeResize(e, row) {
  if (!row) return;
  const startY = e.clientY;
  const startH = row.getBoundingClientRect().height;
  document.body.classList.add("epdf-resizing-table-row");
  setFramePointerPassThrough(true);
  const onMove = (ev) => {
    const dy = ev.clientY - startY;
    const h = Math.max(24, Math.round(startH + dy));
    row.style.height = h + "px";
    [...row.cells].forEach((c) => {
      c.style.height = h + "px";
      c.style.minHeight = h + "px";
      c.style.verticalAlign = "top";
    });
    const rowInput = document.getElementById("tableRowHeight");
    const rowVal = document.getElementById("tableRowHeightVal");
    if (rowInput) rowInput.value = String(h);
    if (rowVal) rowVal.textContent = h + "px";
    positionSelectionOverlay();
  };
  const onUp = () => {
    unbind();
    document.body.classList.remove("epdf-resizing-table-row");
    setFramePointerPassThrough(false);
    snapshot();
  };
  const unbind = bindDragTracking(onMove, onUp);
}

function syncImageInputs(el) {
  const img = selectedImage();
  const wInput = document.getElementById("imgWidth");
  const hInput = document.getElementById("imgHeight");
  const wVal = document.getElementById("imgWidthVal");
  const hVal = document.getElementById("imgHeightVal");
  if (!img || !wInput) return;
  let wPct = 100;
  if (img.style.width?.includes("%")) wPct = parseInt(img.style.width, 10) || 100;
  else if (img.style.width?.includes("px")) {
    const page = img.closest(".epdf-page");
    if (page?.clientWidth) wPct = Math.round((parseInt(img.style.width, 10) / page.clientWidth) * 100);
  }
  wInput.value = String(Math.min(100, Math.max(10, wPct)));
  if (wVal) wVal.textContent = wInput.value + "%";
  let hPct = 0;
  if (img.style.height && img.style.height !== "auto" && img.style.height.includes("%")) {
    hPct = parseInt(img.style.height, 10) || 0;
  }
  if (hInput) hInput.value = String(hPct);
  if (hVal) hVal.textContent = hPct ? hPct + "%" : "Auto";
}

document.getElementById("imgWidth").addEventListener("input", (e) => {
  const img = selectedImage();
  if (!img) return;
  const v = +e.target.value;
  const wVal = document.getElementById("imgWidthVal");
  if (wVal) wVal.textContent = v + "%";
  img.style.width = v + "%";
  img.style.maxWidth = "100%";
  const lock = document.getElementById("imgLockRatio")?.checked;
  const hInput = document.getElementById("imgHeight");
  if (lock || !hInput?.value || hInput.value === "0") {
    img.style.height = "auto";
    const hVal = document.getElementById("imgHeightVal");
    if (hVal) hVal.textContent = "Auto";
    if (hInput) hInput.value = "0";
  }
  positionSelectionOverlay();
});
document.getElementById("imgWidth").addEventListener("change", () => snapshot());
document.getElementById("imgHeight").addEventListener("input", (e) => {
  const img = selectedImage();
  if (!img) return;
  const v = +e.target.value;
  const hVal = document.getElementById("imgHeightVal");
  if (!v) {
    img.style.height = "auto";
    if (hVal) hVal.textContent = "Auto";
  } else {
    img.style.height = v + "%";
    if (hVal) hVal.textContent = v + "%";
    const lock = document.getElementById("imgLockRatio");
    if (lock) lock.checked = false;
  }
  positionSelectionOverlay();
});
document.getElementById("imgHeight").addEventListener("change", () => snapshot());
document.getElementById("tableWidth").addEventListener("input", (e) => {
  const cell = tableCell();
  const table = cell ? tableOf(cell) : selectedEl()?.closest?.("table");
  if (!table) return;
  const v = +e.target.value;
  const twVal = document.getElementById("tableWidthVal");
  if (twVal) twVal.textContent = v + "%";
  table.style.width = v + "%";
  table.style.maxWidth = "100%";
});
document.getElementById("tableWidth").addEventListener("change", () => snapshot());
document.getElementById("tableMinHeight")?.addEventListener("input", (e) => {
  const cell = tableCell();
  const table = cell ? tableOf(cell) : selectedEl()?.closest?.("table");
  if (!table) return;
  const v = +e.target.value;
  const tmhVal = document.getElementById("tableMinHeightVal");
  if (v <= 0) {
    table.style.minHeight = "";
    if (tmhVal) tmhVal.textContent = "Auto";
  } else {
    table.style.minHeight = v + "%";
    if (tmhVal) tmhVal.textContent = v + "%";
  }
  resizeFrame();
});
document.getElementById("tableMinHeight")?.addEventListener("change", () => snapshot());
document.getElementById("tableRowHeight")?.addEventListener("input", (e) => {
  const v = +e.target.value;
  const rowVal = document.getElementById("tableRowHeightVal");
  if (rowVal) rowVal.textContent = v ? v + "px" : "Auto";
  applySelectedRowHeight(v);
});
document.getElementById("tableRowHeight")?.addEventListener("change", () => snapshot());
document.getElementById("tableFullPage")?.addEventListener("click", makeTableFullPage);
document.getElementById("insertTablePage")?.addEventListener("click", () => insertTablePage(5, 4));
document.querySelectorAll("[data-img-align]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const img = selectedImage();
    if (!img) return;
    const fig = img.closest("figure") || img;
    fig.style.textAlign = btn.dataset.imgAlign;
    if (btn.dataset.imgAlign === "center") {
      img.style.display = "block";
      img.style.marginLeft = "auto";
      img.style.marginRight = "auto";
    } else if (btn.dataset.imgAlign === "right") {
      img.style.display = "block";
      img.style.marginLeft = "auto";
      img.style.marginRight = "0";
    } else {
      img.style.display = "block";
      img.style.marginLeft = "0";
      img.style.marginRight = "auto";
    }
    snapshot();
  });
});
document.getElementById("replaceImg").addEventListener("click", () => {
  replaceImage = true;
  document.getElementById("imageFile").click();
});
const imgDrop = document.getElementById("imgDrop");
imgDrop.addEventListener("click", () => {
  replaceImage = false;
  document.getElementById("imageFile").click();
});
imgDrop.addEventListener("dragover", (e) => {
  e.preventDefault();
  imgDrop.classList.add("on");
});
imgDrop.addEventListener("dragleave", () => imgDrop.classList.remove("on"));
imgDrop.addEventListener("drop", (e) => {
  e.preventDefault();
  imgDrop.classList.remove("on");
  if (e.dataTransfer.files?.length) insertImageFiles(e.dataTransfer.files, currentPage());
});

document.addEventListener("dragover", (e) => {
  if (!dragEl) return;
  e.preventDefault();
  const thumb = e.target.closest?.(".page-thumb");
  document.querySelectorAll(".page-thumb.drop-on").forEach((t) => {
    if (!thumb || t !== thumb) t.classList.remove("drop-on");
  });
  if (thumb) thumb.classList.add("drop-on");
});

function insertRow(offset) {
  const cell = tableCell();
  if (!cell) return;
  const table = tableOf(cell);
  const row = cell.parentElement;
  const cols = row.children.length;
  const neu = doc().createElement("tr");
  for (let i = 0; i < cols; i++) neu.appendChild(doc().createElement("td")).textContent = "";
  if (offset) row.insertAdjacentElement("afterend", neu);
  else row.insertAdjacentElement("beforebegin", neu);
  snapshot();
}

function insertCol(offset) {
  const cell = tableCell();
  if (!cell) return;
  const table = tableOf(cell);
  const idx = cellIndex(cell) + offset;
  [...table.rows].forEach((row) => {
    const tag = row.parentElement.tagName === "THEAD" ? "th" : "td";
    const neu = doc().createElement(tag);
    neu.textContent = "";
    const ref = row.cells[idx];
    if (ref) row.insertBefore(neu, ref);
    else row.appendChild(neu);
  });
  snapshot();
}

function deleteRow() {
  const cell = tableCell();
  if (!cell) return;
  const row = cell.parentElement;
  if (row.parentElement.rows && row.parentElement.rows.length < 2) return;
  row.remove();
  markSelected(null);
  snapshot();
}

function deleteCol() {
  const cell = tableCell();
  if (!cell) return;
  const table = tableOf(cell);
  const idx = cellIndex(cell);
  [...table.rows].forEach((row) => {
    if (row.cells[idx]) row.deleteCell(idx);
  });
  markSelected(null);
  snapshot();
}

function toggleHead() {
  const cell = tableCell();
  const table = tableOf(cell) || selectedEl()?.closest("table");
  if (!table) return;
  const first = table.rows[0];
  if (!first) return;
  const toHead = [...first.cells].every((c) => c.tagName === "TD");
  [...first.cells].forEach((c) => {
    const neu = doc().createElement(toHead ? "th" : "td");
    neu.innerHTML = c.innerHTML;
    c.replaceWith(neu);
  });
  snapshot();
}

document.getElementById("convertTable")?.addEventListener("click", () => {
  const el = selectedEl();
  if (!el) return;
  const text = el.innerText || "";
  const rows = text.split(/\r?\n/).map((ln) => ln.split(/\t|\s{2,}|\s\|\s/)).filter((r) => r.some(Boolean));
  if (rows.length < 2) return;
  const html = rowsToTable(rows);
  el.insertAdjacentHTML("afterend", html);
  el.remove();
  snapshot();
});

function rowsToTable(rows) {
  const [head, ...body] = rows;
  const thead = "<thead><tr>" + head.map((c) => `<th>${escapeHtml(c.trim())}</th>`).join("") + "</tr></thead>";
  const tbody = "<tbody>" + body.map((r) => "<tr>" + r.map((c) => `<td>${escapeHtml(c.trim())}</td>`).join("") + "</tr>").join("") + "</tbody>";
  return `<table class="epdf-table epdf-table-full" style="width:100%;max-width:100%;table-layout:fixed">${thead}${tbody}</table>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

document.getElementById("pasteTable").addEventListener("click", () => {
  document.getElementById("pasteModal").showModal();
});
document.getElementById("pasteCancel").addEventListener("click", () => document.getElementById("pasteModal").close());
document.getElementById("pasteApply").addEventListener("click", () => {
  const raw = document.getElementById("pasteArea").value.trim();
  const rows = raw.split(/\r?\n/).map((ln) => ln.split("\t"));
  if (rows.length) insertNode(rowsToTable(rows));
  document.getElementById("pasteModal").close();
});

document.getElementById("undoDock")?.addEventListener("click", doUndo);
document.getElementById("redoDock")?.addEventListener("click", doRedo);
document.getElementById("previewDock")?.addEventListener("click", () => openReview());
document.getElementById("publishDock")?.addEventListener("click", doPublish);
document.getElementById("publishTop")?.addEventListener("click", doPublish);
document.getElementById("preview")?.addEventListener("click", () => openReview());

function openReview() {
  if (!templateApplied) {
    alert("Choose and apply a template before reviewing your book design.");
    if (editorMode === "write") openFormatStage();
    return;
  }
  const html = serialize();
  const hidden = document.createElement("iframe");
  hidden.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
  hidden.title = "Review loader";
  document.body.appendChild(hidden);
  hidden.srcdoc = withBase(html);
  hidden.onload = () => {
    const rdoc = hidden.contentDocument;
    if (!rdoc) {
      hidden.remove();
      return;
    }
    reviewCache.head = rdoc.head.innerHTML;
    reviewCache.pages = [...rdoc.querySelectorAll(".epdf-page")].map((p) => p.outerHTML);
    hidden.remove();
    if (!reviewCache.pages.length) {
      reviewCache.pages = [rdoc.body.innerHTML];
    }
    setDocTitle(document.getElementById("docTitle")?.textContent);
    setEditorMode("review");
    markFlow(4);
    buildReviewPageStrip();
    goReviewPage(0);
    bindReviewResize();
  };
}

function bindReviewResize() {
  const viewport = document.getElementById("reviewViewport");
  if (!viewport || typeof ResizeObserver === "undefined") return;
  if (reviewResizeObs) reviewResizeObs.disconnect();
  reviewResizeObs = new ResizeObserver(() => goReviewPage(reviewActivePage, true));
  reviewResizeObs.observe(viewport);
}

function goReviewPage(index, resizeOnly) {
  if (!reviewCache.pages.length) return;
  const next = Math.max(0, Math.min(index, reviewCache.pages.length - 1));
  const main = document.getElementById("reviewMainFrame");
  const viewport = document.getElementById("reviewViewport");
  const scaleWrap = document.getElementById("reviewScale");
  const label = document.getElementById("reviewPageLabel");

  if (resizeOnly && next === reviewActivePage && main?.contentDocument?.querySelector(".epdf-page")) {
    const page = main.contentDocument.querySelector(".epdf-page");
    const ph = page.offsetHeight || 1123;
    const pad = 32;
    const availW = viewport.clientWidth - pad;
    const availH = viewport.clientHeight - pad - 28;
    const scale = Math.min(availW / 794, availH / ph, 1);
    scaleWrap.style.width = Math.ceil(794 * scale) + "px";
    scaleWrap.style.height = Math.ceil(ph * scale) + "px";
    main.style.transform = "scale(" + scale + ")";
    return;
  }

  reviewActivePage = next;
  if (label) {
    label.textContent = "Page " + (reviewActivePage + 1) + " of " + reviewCache.pages.length;
  }
  if (window.EPDF_GALLERY?.showReviewPage) {
    window.EPDF_GALLERY.showReviewPage(
      main,
      viewport,
      scaleWrap,
      reviewCache.head,
      reviewCache.pages[reviewActivePage]
    );
  } else if (main) {
    main.srcdoc = window.EPDF_GALLERY.pageDoc(reviewCache.head, reviewCache.pages[reviewActivePage]);
  }
  if (!resizeOnly) {
    const strip = document.getElementById("reviewPageStrip");
    strip?.querySelectorAll(".review-page-thumb").forEach((b, i) => {
      b.classList.toggle("on", i === reviewActivePage);
    });
    const active = strip?.querySelector(".review-page-thumb.on");
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function buildReviewPageStrip() {
  const strip = document.getElementById("reviewPageStrip");
  if (!strip) return;
  strip.innerHTML = "<p class=\"strip-title\">Pages</p>";
  if (!reviewCache.pages.length) {
    const empty = document.createElement("p");
    empty.className = "muted tiny strip-empty";
    empty.textContent = "1 page";
    strip.appendChild(empty);
    return;
  }
  reviewCache.pages.forEach((pageHtml, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "review-page-thumb" + (i === reviewActivePage ? " on" : "");
    const slot = document.createElement("div");
    slot.className = "review-thumb-slot";
    btn.appendChild(slot);
    const num = document.createElement("span");
    num.className = "page-num";
    num.textContent = String(i + 1);
    btn.appendChild(num);
    if (window.EPDF_GALLERY?.mountReviewThumb) {
      window.EPDF_GALLERY.mountReviewThumb(slot, reviewCache.head, pageHtml);
    }
    btn.addEventListener("click", () => goReviewPage(i));
    strip.appendChild(btn);
  });
}

document.getElementById("reviewEditDesign")?.addEventListener("click", () => {
  setEditorMode("design");
  markFlow(4);
});
document.getElementById("reviewPublishTop")?.addEventListener("click", () => doPublish());
document.getElementById("reviewClose")?.addEventListener("click", () => {
  setEditorMode("design");
});
document.getElementById("reviewEdit")?.addEventListener("click", () => {
  setEditorMode("design");
  markFlow(templateApplied ? 3 : 2);
});
document.getElementById("reviewWeb")?.addEventListener("click", () => {
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(serialize());
    w.document.close();
  }
});
document.getElementById("reviewPublish")?.addEventListener("click", () => doPublish());

document.querySelectorAll(".rail-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    showPanel(btn.dataset.panel);
  });
});

document.getElementById("collapsePanel")?.addEventListener("click", () => setPropPanelCollapsed(true));
document.getElementById("expandPanel")?.addEventListener("click", () => setPropPanelCollapsed(false));
document.getElementById("panelEdgeToggle")?.addEventListener("click", togglePropPanel);

let layoutPickCols = 1;
document.querySelectorAll("[data-layout-cols]").forEach((btn) => {
  btn.addEventListener("click", () => {
    layoutPickCols = Number(btn.dataset.layoutCols);
    document.querySelectorAll("[data-layout-cols]").forEach((b) => b.classList.toggle("active", b === btn));
  });
});
document.getElementById("layoutApplyPage")?.addEventListener("click", () => applyLayoutScope(layoutPickCols, "page"));
document.getElementById("layoutApplyAll")?.addEventListener("click", () => {
  const skip = layoutSkipPages();
  const msg =
    layoutPickCols === 2
      ? `Apply 2 columns to all pages except the first ${skip} (cover/title)? Every block will flow into left/right columns.`
      : "Apply single column to every page in the book?";
  if (confirm(msg)) applyLayoutScope(layoutPickCols, "all");
});
document.getElementById("layoutReflowPage")?.addEventListener("click", () => {
  const page = selectedPage || currentPage();
  if (!page) return;
  reflowPageColumns(page);
});
document.getElementById("blockFullWidth")?.addEventListener("click", () => {
  const block = selectionBlock();
  if (block) setBlockSpanFullWidth(block, true);
});
document.getElementById("blockInColumn")?.addEventListener("click", () => {
  const block = selectionBlock();
  if (block) setBlockSpanFullWidth(block, false);
});
document.getElementById("pageColLeft")?.addEventListener("input", (e) => {
  const page = selectedPage || currentPage();
  if (!page || pageLayoutCols(page) !== 2) return;
  applyColumnWidths(page, parseInt(e.target.value, 10) || 50);
});
document.getElementById("pageColLeft")?.addEventListener("change", () => {
  snapshot();
  const page = selectedPage || currentPage();
  if (page) refreshPageNavThumb(pageList().indexOf(page));
});
document.querySelectorAll("#colRatioPresets [data-col-left]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = selectedPage || currentPage();
    if (!page || pageLayoutCols(page) !== 2) return;
    applyColumnWidths(page, Number(btn.dataset.colLeft) || 50);
    snapshot();
    refreshPageNavThumb(pageList().indexOf(page));
  });
});
document.getElementById("epdf-col-divider")?.addEventListener("mousedown", (e) =>
  startColumnResize(e, "divider")
);
wireColOverlay();

function wirePagePaddingInputs() {
  const bind = (id, valId, key) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("input", () => {
      const page = selectedPage || currentPage();
      if (!page?.classList?.contains("epdf-page")) return;
      const cur = readPagePadding(page);
      const v = Number(input.value);
      const val = document.getElementById(valId);
      if (val) val.textContent = `${v}px`;
      applyPagePadding(
        page,
        key === "top" ? v : cur.top,
        key === "sides" ? v : cur.sides,
        key === "gap" ? v : cur.gap
      );
    });
    input.addEventListener("change", () => snapshot());
  };
  bind("pagePadTop", "pagePadTopVal", "top");
  bind("pagePadSides", "pagePadSidesVal", "sides");
  bind("pageColGap", "pageColGapVal", "gap");
}
wirePagePaddingInputs();

document.getElementById("epdf-page-toolbar")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-page-act]");
  if (!btn) return;
  const act = btn.dataset.pageAct;
  if (act === "dup") duplicatePage();
  if (act === "delete") deleteCurrentPage();
  if (act === "up") shiftPage(-1);
  if (act === "down") shiftPage(1);
});

document.getElementById("layoutDupPage")?.addEventListener("click", duplicatePage);
document.getElementById("layoutDelPage")?.addEventListener("click", deleteCurrentPage);
document.getElementById("layoutPageUp")?.addEventListener("click", () => shiftPage(-1));
document.getElementById("layoutPageDown")?.addEventListener("click", () => shiftPage(1));

try {
  if (localStorage.getItem("epdf-prop-panel-collapsed") === "1") {
    setPropPanelCollapsed(true);
  }
} catch {
  /* ignore */
}

function markFlow(n) {
  document.querySelectorAll(".flow-step").forEach((btn) => {
    const s = Number(btn.dataset.flow);
    btn.classList.toggle("on", s === n);
    btn.classList.toggle("done", s < n);
  });
}

document.querySelectorAll(".flow-step").forEach((btn) => {
  btn.addEventListener("click", () => {
    const s = Number(btn.dataset.flow);
    if (s === 1) location.href = "/?create=1";
    if (s === 2) showWriteMode();
    if (s === 3) {
      if (editorMode === "write" && !templateApplied) openFormatStage();
      else openTemplateStage();
    }
    if (s === 4) openReview();
    if (s === 5) doPublish();
  });
});

async function showWriteMode() {
  const res = await fetch(`/api/jobs/${jobId}`);
  const data = await res.json();
  let html = data.html;
  if (data.template_applied && data.extracted_html) {
    html = wrapManuscriptClient(data.extracted_html, data.title);
  }
  setEditorMode("write");
  undoStack = [];
  histIndex = -1;
  frame.srcdoc = withBase(html);
  markFlow(2);
  syncEditorUrl("write");
  closeTemplateStage();
  closeFormatStage();
}

function enterDesignMode(html, goReview) {
  templateApplied = true;
  setEditorMode("design");
  undoStack = [];
  histIndex = -1;
  frame.srcdoc = withBase(html);
  closeTemplateStage();
  if (goReview !== false) {
    syncEditorUrl("review");
    frame.addEventListener("load", function onReady() {
      frame.removeEventListener("load", onReady);
      setTimeout(() => openReview(), 300);
    });
  } else {
    syncEditorUrl("design");
    markFlow(4);
  }
}

function openFormatStage() {
  const el = document.getElementById("formatStage");
  if (!el) return;
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  document.body.classList.add("pick-format");
  closeTemplateStage();
  markFlow(3);
}

function closeFormatStage() {
  const el = document.getElementById("formatStage");
  if (!el) return;
  el.classList.add("hidden");
  el.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pick-format");
}

function openTemplateStage() {
  const el = document.getElementById("templateStage");
  if (!el) return;
  closeFormatStage();
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  document.body.classList.add("pick-templates");
  markFlow(3);
  syncEditorUrl("templates");
  renderTemplateStage();
}

function closeTemplateStage() {
  const el = document.getElementById("templateStage");
  if (!el) return;
  el.classList.add("hidden");
  el.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pick-templates");
}

async function ensureTemplates() {
  if (templates.length) return templates;
  try {
    const res = await fetch("/api/templates");
    const data = await res.json();
    if (data.templates?.length) templates = data.templates;
  } catch {
    templates = window.EPDF_TEMPLATES || templates;
  }
  if (!templates.length) templates = window.EPDF_TEMPLATES || [];
  return templates;
}

function visibleStageTemplates() {
  const q = (document.getElementById("tplStageSearch")?.value || "").toLowerCase();
  let list = tplStageFilter === "All" ? templates : templates.filter((t) => t.category === tplStageFilter);
  if (q) list = list.filter((t) => (t.name + t.category + (t.best_for || "") + (t.description || "")).toLowerCase().includes(q));
  const featured = ["minimal-snow", "cream-handbook", "magazine-bold", "night-gold", "academic-serif", "legrand-research"];
  return list.slice().sort((a, b) => {
    const ai = featured.indexOf(a.id);
    const bi = featured.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function renderTemplateStage() {
  const filters = document.getElementById("tplStageFilters");
  const gallery = document.getElementById("tplStageGallery");
  if (!filters || !gallery) return;
  gallery.innerHTML = "<p class='tpl-loading'>Loading templates…</p>";
  ensureTemplates().then(() => {
    if (!templates.length) {
      gallery.innerHTML = "<p class='tpl-loading'>No templates found. Check that the server is running.</p>";
      return;
    }
    const cats = ["All", ...[...new Set(templates.map((t) => t.category))]];
    filters.innerHTML = "";
    cats.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = cat === tplStageFilter ? "on" : "";
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        tplStageFilter = cat;
        renderTemplateStage();
      });
      filters.appendChild(btn);
    });
    const items = visibleStageTemplates();
    if (!tplStageSelected && items[0]) tplStageSelected = items[0].id;
    const chosen = document.getElementById("tplStageChosen");
    const sel = templates.find((t) => t.id === tplStageSelected);
    if (chosen) chosen.textContent = sel ? `Selected: ${sel.name} — click Use, or double‑click a cover` : "Selected: —";
    gallery.innerHTML = "";
    if (!items.length) {
      gallery.innerHTML = "<p class='tpl-loading'>No templates match your search.</p>";
      return;
    }
    const featuredIds = new Set(["minimal-snow", "cream-handbook", "magazine-bold", "night-gold", "academic-serif", "legrand-research"]);
    items.forEach((tpl) => {
      const card = document.createElement("article");
      card.className = "tpl-stage-card" + (tpl.id === tplStageSelected ? " selected" : "");
      card.dataset.id = tpl.id;
      const badge = featuredIds.has(tpl.id) ? `<span class="tpl-badge">Popular</span>` : "";
      card.innerHTML = `
        <div class="tpl-thumb-slot"></div>
        <div class="meta">
          <b>${tpl.name}</b>
          <em>${tpl.category}</em>
          <p>${tpl.description || tpl.best_for || ""}</p>
        </div>
        <div class="tpl-card-actions">
          <button type="button" class="ghost" data-preview>Preview</button>
          <button type="button" class="publish" data-use>Use</button>
        </div>`;
      window.EPDF_GALLERY?.mountCover(card.querySelector(".tpl-thumb-slot"), tpl);
      if (badge) card.querySelector(".tpl-thumb-slot")?.insertAdjacentHTML("afterbegin", badge);
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-use],[data-preview]")) return;
        tplStageSelected = tpl.id;
        const chosenEl = document.getElementById("tplStageChosen");
        if (chosenEl) chosenEl.textContent = `Selected: ${tpl.name} — click Use, or double‑click a cover`;
        gallery.querySelectorAll(".tpl-stage-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
      });
      card.addEventListener("dblclick", () => applyTemplateById(tpl.id));
      card.querySelector("[data-preview]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openTplPick(tpl);
      });
      card.querySelector("[data-use]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        applyTemplateById(tpl.id);
      });
      gallery.appendChild(card);
    });
  });
}

function openTplPick(tpl) {
  tplPickId = tpl.id;
  document.getElementById("tplPickTitle").textContent = tpl.name;
  const hint = document.getElementById("tplPickHint");
  if (hint) {
    hint.textContent = "You'll be able to play with the template and change covers inside the editor.";
  }
  const tags = document.getElementById("tplPickTags");
  if (tags) {
    tags.innerHTML = "";
    [tpl.category, ...(tpl.best_for || "").split(",").slice(0, 3)].filter(Boolean).forEach((t) => {
      const span = document.createElement("span");
      span.textContent = t.trim();
      tags.appendChild(span);
    });
  }
  const frameEl = document.getElementById("tplPickFrame");
  const strip = document.getElementById("tplPickThumbs");
  if (window.EPDF_GALLERY && strip) {
    window.EPDF_GALLERY.buildPreviewThumbStrip(strip, tpl, frameEl);
  }
  frameEl.srcdoc = "<p style='padding:40px;font-family:Inter,sans-serif'>Loading preview…</p>";
  fetch("/api/templates/" + encodeURIComponent(tpl.id) + "/preview")
    .then((r) => r.text())
    .then((html) => {
      frameEl.srcdoc = html;
      frameEl.onload = () => window.EPDF_GALLERY?.scrollPreviewFrame(frameEl, 0);
    })
    .catch(() => {
      frameEl.src = "/api/templates/" + encodeURIComponent(tpl.id) + "/preview";
    });
  document.getElementById("tplPickModal").showModal();
}

async function applyTemplateById(id) {
  showBusy("Applying template…");
  try {
    await saveNow();
    setSaveUi("Applying template…");
    const r = await fetch(`/api/jobs/${jobId}/apply-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: id }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      setSaveUi(out.detail || "Template failed");
      return;
    }
    document.getElementById("tplPickModal")?.close();
    closeFormatStage();
    closeTemplateStage();
    enterDesignMode(out.html);
    setSaveUi("Template applied");
  } finally {
    hideBusy();
  }
}

function showBusy(msg) {
  let el = document.getElementById("epdfBusy");
  if (!el) {
    el = document.createElement("div");
    el.id = "epdfBusy";
    el.className = "epdf-busy";
    el.innerHTML = `<div class="epdf-busy-card"><div class="epdf-busy-spin"></div><p></p></div>`;
    document.body.appendChild(el);
  }
  el.querySelector("p").textContent = msg || "Working…";
  el.hidden = false;
}
function hideBusy() {
  const el = document.getElementById("epdfBusy");
  if (el) el.hidden = true;
}

document.getElementById("tplStageBack")?.addEventListener("click", () => {
  closeTemplateStage();
  markFlow(2);
});
document.getElementById("tplStageSearch")?.addEventListener("input", () => renderTemplateStage());
document.getElementById("tplPickClose")?.addEventListener("click", () => document.getElementById("tplPickModal").close());
document.getElementById("tplPickUse")?.addEventListener("click", () => {
  if (tplPickId) applyTemplateById(tplPickId);
});
document.getElementById("tplPickWeb")?.addEventListener("click", () => {
  if (tplPickId) window.open("/api/templates/" + encodeURIComponent(tplPickId) + "/preview", "_blank");
});
document.getElementById("tplPickPdf")?.addEventListener("click", () => {
  alert("Publish your book from the Review step to download the PDF.");
});

document.getElementById("chooseFormat")?.addEventListener("click", () => openFormatStage());
document.getElementById("formatBack")?.addEventListener("click", () => {
  closeFormatStage();
  markFlow(2);
});
document.querySelectorAll("#formatStage .format-card:not(.locked)").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll("#formatStage .format-card").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
  });
});
document.getElementById("formatGo")?.addEventListener("click", async () => {
  await saveNow();
  await ensureTemplates();
  openTemplateStage();
});

frame.addEventListener("load", bindFrame);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cleanupDragUi();
});

async function loadEditorTemplates() {
  const res = await fetch("/api/templates");
  const data = await res.json();
  const list = document.getElementById("tplList");
  if (!list) return;
  list.innerHTML = "";
  (data.templates || []).forEach((tpl) => {
    const el = document.createElement("div");
    el.className = "tpl-mini";
    el.innerHTML = `
      <div class="tpl-mini-cover"></div>
      <div class="tpl-mini-meta">
        <span>${tpl.category}</span><b>${tpl.name}</b>
        <div class="row">
          <button type="button" data-pv>Preview</button>
          <button type="button" data-use class="publish">Use</button>
        </div>
      </div>`;
    window.EPDF_GALLERY?.mountCover(el.querySelector(".tpl-mini-cover"), tpl);
    el.querySelector("[data-pv]").addEventListener("click", () => openTplPick(tpl));
    el.querySelector("[data-use]").addEventListener("click", () => applyTemplateById(tpl.id));
    list.appendChild(el);
  });
}

(async function init() {
  if (!jobId) {
    alert("Missing project id in the URL. Opening the home page.");
    location.href = "/";
    return;
  }
  syncEditorUrl(stage);
  const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    alert("This project was not found (it may have been deleted). Opening home.");
    location.href = "/";
    return;
  }
  const data = await res.json();
  setDocTitle(data.title || "Document");
  document.getElementById("docMeta").textContent = `${data.page_count || 1} pages · ${data.table_count || 0} tables`;
  const dm = document.getElementById("docMetaDesign");
  if (dm) dm.textContent = `${data.page_count || 1} pages · ${data.table_count || 0} tables`;
  templateApplied = !!data.template_applied;
  updateEditedTime();

  if (stage === "templates") {
    setEditorMode("write");
    syncEditorUrl("templates");
    frame.srcdoc = withBase(data.html || "");
    ensureTemplates().then(() => openTemplateStage());
  } else if (stage === "review" || stage === "design" || stage === "publish" || templateApplied) {
    frame.srcdoc = withBase(data.html || "");
    if (stage === "review") {
      setEditorMode("design");
      syncEditorUrl("review");
      setTimeout(() => openReview(), 500);
    } else if (stage === "publish") {
      setEditorMode("design");
      syncEditorUrl("publish");
      markFlow(5);
    } else if (stage === "write" && templateApplied) {
      // Templated book opened with stage=write → stay in write/manuscript view
      setEditorMode("write");
      syncEditorUrl("write");
      markFlow(2);
    } else {
      setEditorMode("design");
      syncEditorUrl("design");
      markFlow(4);
    }
  } else {
    setEditorMode("write");
    syncEditorUrl("write");
    frame.srcdoc = withBase(data.html || wrapManuscriptClient(data.extracted_html, data.title));
    markFlow(2);
  }

  loadEditorTemplates();
  ensureTemplates();
  wireSelectionOverlay();
  syncLayoutPanel();
})();
