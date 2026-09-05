const params = new URLSearchParams(location.search);
const jobFromUrl = params.get("job") || "";
const statusEl = document.getElementById("status");
const srcInput = document.getElementById("source");
const srcCreate = document.getElementById("sourceCreate");
const tplInput = document.getElementById("templates");
const templateIdInput = document.getElementById("templateId");
const chosenEl = document.getElementById("chosen");
const gallery = document.getElementById("gallery");
const previewModal = document.getElementById("previewModal");
const previewFrame = document.getElementById("previewFrame");
const previewTitle = document.getElementById("previewTitle");

let templates = window.EPDF_TEMPLATES || [];
let previewingId = "";
let selectedId = "cream-handbook";
let activeFilter = "All";
let pendingFile = null;
let method = "import";

function showScreen(name) {
  ["home", "create", "templates"].forEach((id) => {
    document.getElementById("screen-" + id).classList.toggle("hidden", id !== name);
  });
  const stepper = document.getElementById("stepper");
  stepper.classList.toggle("hidden", name === "home");
  markStep(name === "templates" ? 3 : name === "create" ? 1 : 0);
  document.querySelectorAll(".side-nav a").forEach((a) => {
    a.classList.toggle("on", (a.dataset.nav === "home" && name === "home") || (a.dataset.nav === "projects" && name === "home"));
  });
}

function markStep(n) {
  document.querySelectorAll(".step").forEach((btn) => {
    const s = Number(btn.dataset.step);
    btn.classList.toggle("on", s === n);
    btn.classList.toggle("done", s < n);
  });
}

function selectTemplate(id, name) {
  selectedId = id;
  templateIdInput.value = id;
  if (chosenEl) chosenEl.textContent = "Selected: " + name;
  gallery.querySelectorAll(".tpl-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.id === id);
  });
}

function localPreviewHtml(tpl) {
  const title = tpl.sampleTitle || tpl.name;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>body{margin:0;background:${tpl.bg};color:${tpl.ink};font-family:Georgia,serif;padding:40px}h1{font-size:36px}</style>
  </head><body><h1>${title}</h1><p>${tpl.description || ""}</p></body></html>`;
}

function escHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function jobGradient(id) {
  const hues = [215, 200, 260, 340, 175, 25];
  const h = hues[(id || "a").charCodeAt(0) % hues.length];
  return `linear-gradient(145deg, hsl(${h}, 52%, 26%) 0%, hsl(${h}, 68%, 48%) 55%, hsl(${h}, 80%, 72%) 100%)`;
}

function buildPreviewThumbs(tpl) {
  const strip = document.getElementById("previewThumbs");
  if (window.EPDF_GALLERY?.buildPreviewThumbStrip) {
    window.EPDF_GALLERY.buildPreviewThumbStrip(strip, tpl, previewFrame);
    return;
  }
  if (!strip) return;
  strip.innerHTML = "";
}

function scrollPreviewToPage(index) {
  const win = previewFrame.contentWindow;
  const doc = previewFrame.contentDocument;
  if (!win || !doc) return;
  const pages = doc.querySelectorAll(".epdf-page");
  const page = pages[index] || pages[0];
  if (page) page.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openPreview(tpl) {
  previewingId = tpl.id;
  previewTitle.textContent = tpl.name;
  const hint = document.getElementById("previewHint");
  if (hint) hint.textContent = "You'll be able to play with the template and change covers inside the editor.";
  const tags = document.getElementById("previewTags");
  if (tags) {
    tags.innerHTML = "";
    [tpl.category, ...(tpl.best_for || "").split(",").slice(0, 3)].filter(Boolean).forEach((t) => {
      const span = document.createElement("span");
      span.textContent = t.trim();
      tags.appendChild(span);
    });
  }
  buildPreviewThumbs(tpl);
  previewFrame.srcdoc = "<p style='padding:40px;font-family:Inter,sans-serif'>Loading preview…</p>";
  fetch("/api/templates/" + encodeURIComponent(tpl.id) + "/preview")
    .then((res) => (res.ok ? res.text() : Promise.reject()))
    .then((html) => {
      previewFrame.srcdoc = html;
      previewFrame.onload = () => {
        if (window.EPDF_GALLERY?.scrollPreviewFrame) window.EPDF_GALLERY.scrollPreviewFrame(previewFrame, 0);
        else scrollPreviewToPage(0);
      };
    })
    .catch(() => { previewFrame.srcdoc = localPreviewHtml(tpl); });
  previewModal.showModal();
}

function visibleTemplates() {
  const q = (document.getElementById("tplSearch").value || "").toLowerCase();
  let list = activeFilter === "All" ? templates : templates.filter((t) => t.category === activeFilter);
  if (q) list = list.filter((t) => (t.name + t.category + (t.best_for || "")).toLowerCase().includes(q));
  return list;
}

function renderFilters() {
  const el = document.getElementById("filters");
  if (!el) return;
  const cats = ["All", ...[...new Set(templates.map((t) => t.category))]];
  el.innerHTML = "";
  cats.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (cat === activeFilter ? " on" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      activeFilter = cat;
      renderFilters();
      renderGallery(visibleTemplates(), selectedId);
    });
    el.appendChild(btn);
  });
}

function coverHtml(tpl) {
  const title = tpl.sampleTitle || tpl.name;
  const author = "Author Name";
  const id = tpl.id;
  const inner = {
    "cream-handbook": `<span class="bc-title">${title}</span><span class="bc-author">${author}</span>`,
    "corporate-navy": `<span class="bc-title">MINDSET</span><div class="bc-arrow"></div><span class="bc-author">${author}</span>`,
    "magazine-bold": `<span class="bc-kicker">Playful Vibes</span><div class="photo"></div><div class="waves"></div><span class="bc-author">${author}</span>`,
    "minimal-snow": `<span class="bc-title">stayin' young</span><span class="bc-author">${author}</span>`,
    "night-gold": `<div class="rings"></div><div class="plant"></div><span class="bc-title">Passion, Grit and Success</span><span class="bc-author">${author}</span>`,
    "academic-serif": `<span class="bc-kicker">University Press</span><div class="rule"></div><span class="bc-title">${title}</span><div class="rule"></div><span class="bc-sub">A scholarly monograph</span>`,
    "startup-sky": `<span class="bc-title">micro <span>LEARNING</span></span><div class="geo"></div>`,
    "legal-brief": `<span class="bc-kicker">In the matter of</span><span class="bc-title">${title}</span><span class="bc-author">${author}</span>`,
    "annual-navy": `<div class="photo"></div><span class="bc-title">TOTAL ENERGY</span><span class="bc-author">${author}</span>`,
    "cookbook-rust": `<div class="banner">${title}</div><div class="plate"></div><span class="bc-author">${author}</span>`,
    "storybook": `<span class="bc-title">${title}</span><div class="scene"><div class="phone"><i class="head"></i></div><span class="hearts">♥</span><div class="phone"><i class="head"></i></div></div>`,
    "tech-slate": `<span class="bc-kicker">AUTHOR NAME</span><span class="bc-title">${title}</span>`,
    "blush-invite": `<span class="bc-title">Blind Date</span><div class="heart"></div><span class="bc-author">${author}</span>`,
    "newsprint": `<span class="bc-title">City Desk</span><div class="cols"><span><i></i><i></i><i></i><i></i></span><span><i></i><i></i><i></i><i></i></span><span><i></i><i></i><i></i><i></i></span></div>`,
    "obsidian-luxe": `<span class="bc-title">SILK</span><span class="bc-sub">Lookbook 01</span><span class="bc-author">${author}</span>`,
    "forest-journal": `<div class="splash"></div><span class="bc-title">PRESENCE</span>`,
    "lilac-soft": `<i class="face a"></i><i class="face b"></i><span class="bc-title">BODY &amp; SOUL</span>`,
    "royal-maroon": `<span class="bc-title">${title}</span><div class="jewel"></div><span class="bc-author">${author}</span>`,
    "clinic-teal": `<span class="bc-title">tagline</span><span class="bc-sub">${tpl.best_for || ""}</span><div class="mark">T</div>`,
    "studio-red": `<div class="blocks"><i class="blk b1"></i><i class="blk b2"></i><i class="blk b3"></i></div><span class="bc-title">BUSINESS CYCLE</span>`,
    "legrand-research": `<div class="lg-banner"></div><span class="bc-kicker">Research report</span><span class="bc-title">${title}</span><span class="bc-sub">Data mining &amp; machine learning</span><span class="bc-author">${author}</span>`,
    "column-gazette": `<span class="bc-kicker">Gazette</span><span class="bc-title">${title}</span><div class="cols"><span><i></i><i></i><i></i><i></i></span><span><i></i><i></i><i></i><i></i></span></div>`,
  }[id];
  return `<div class="book-cover cover-${id}">${inner || `<span class="bc-title">${title}</span>`}</div>`;
}

function renderGallery(items, defaultId) {
  gallery.innerHTML = "";
  items.forEach((tpl) => {
    const card = document.createElement("article");
    card.className = "tpl-card" + (tpl.id === defaultId ? " selected" : "");
    card.dataset.id = tpl.id;
    card.innerHTML = `
      <div class="tpl-book-wrap">
        <div class="tpl-thumb-slot"></div>
        <div class="tpl-hover">
          <button type="button" class="ghost-btn" data-preview>Preview</button>
          <button type="button" class="use-btn" data-use>Use</button>
        </div>
      </div>
      <div class="tpl-meta">
        <span>${tpl.name}</span>
        <b>${tpl.category}${tpl.best_for ? " · " + tpl.best_for.split(",")[0] : ""}</b>
      </div>`;
    if (window.EPDF_GALLERY) {
      window.EPDF_GALLERY.mountThumb(card.querySelector(".tpl-thumb-slot"), tpl.id);
    }
    card.querySelector("[data-preview]").addEventListener("click", (e) => {
      e.stopPropagation();
      openPreview(tpl);
    });
    card.querySelector("[data-use]").addEventListener("click", (e) => {
      e.stopPropagation();
      selectTemplate(tpl.id, tpl.name);
      applySelectedTemplate();
    });
    card.addEventListener("click", () => openPreview(tpl));
    gallery.appendChild(card);
  });
}

function isSourceFile(name) {
  return /\.(pdf|docx|docm|doc|rtf)$/i.test(name || "");
}

function setPending(file) {
  pendingFile = file;
  const name = file ? file.name : "Choose a Word (.docx) or PDF";
  const srcName = document.getElementById("srcName");
  if (srcName) srcName.textContent = name;
  const modalName = document.getElementById("modalFileName");
  if (modalName) modalName.textContent = file ? file.name : "No file chosen yet";
  if (statusEl && file) statusEl.textContent = file.name + " ready";
}

function errorText(data, fallback) {
  const detail = data && data.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0] && detail[0].msg) return detail[0].msg;
  return fallback;
}

function goEditor(jobId, stage) {
  const q = stage ? `&stage=${encodeURIComponent(stage)}` : "";
  location.assign(`/editor?job=${encodeURIComponent(jobId)}${q}`);
}

let processLock = false;
async function processFile(file) {
  if (processLock) return;
  processLock = true;
  if (statusEl) statusEl.textContent = "Extracting file…";
  try {
    const fd = new FormData();
    fd.append("source", file, file.name);
    fd.append("file", file, file.name);
    const res = await fetch("/api/process", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = errorText(data, "Process failed");
      if (statusEl) statusEl.textContent = msg;
      throw new Error(msg);
    }
    // replace so Refresh does not re-POST / recreate another job
    location.replace(`/editor?job=${encodeURIComponent(data.job_id)}&stage=write`);
  } finally {
    processLock = false;
  }
}

async function startBlank(title) {
  if (statusEl) statusEl.textContent = "Opening a blank book…";
  const res = await fetch("/api/blank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title || "Untitled book" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (statusEl) statusEl.textContent = errorText(data, "Could not start");
    return;
  }
  location.replace(`/editor?job=${encodeURIComponent(data.job_id)}&stage=write`);
}

async function applySelectedTemplate() {
  const job = jobFromUrl || sessionStorage.getItem("epdf_job");
  if (!job) {
    if (statusEl) statusEl.textContent = "Open a project first, then choose a template.";
    return;
  }
  const res = await fetch(`/api/jobs/${job}/apply-template`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template_id: selectedId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(errorText(data, "Could not apply template"));
    return;
  }
  goEditor(job, "review");
}

function wireFile(input) {
  if (!input) return;
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    if (!isSourceFile(file.name)) {
      if (statusEl) statusEl.textContent = "Only .pdf, .docx, or .doc files are supported";
      return;
    }
    setPending(file);
    method = "import";
    document.getElementById("methodBtn").textContent = "Import from Word or PDF";
    document.getElementById("importModal").showModal();
  });
}

wireFile(srcInput);
wireFile(srcCreate);

const drop = document.getElementById("srcDrop");
if (drop) {
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  const file = [...e.dataTransfer.files].find((f) => isSourceFile(f.name));
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    srcInput.files = dt.files;
    setPending(file);
    showScreen("create");
    history.replaceState({}, "", "/?create=1");
    document.getElementById("importModal").showModal();
  }
});
}

if (tplInput) {
  const box = document.getElementById("tplDrop");
  box.addEventListener("change", () => {}, true);
  tplInput.addEventListener("change", () => {
    document.getElementById("tplName").textContent = [...tplInput.files].map((f) => f.name).join(", ") || "HTML, CSS, or ZIP";
  });
}

document.getElementById("newBook").addEventListener("click", () => {
  showScreen("create");
  history.pushState({}, "", "/?create=1");
});
document.getElementById("startBlank").addEventListener("click", () => {
  method = "blank";
  document.getElementById("methodBtn").textContent = "Start from scratch";
  showScreen("create");
  history.pushState({}, "", "/?create=1");
});
document.getElementById("startIdea").addEventListener("click", () => {
  const idea = document.getElementById("idea").value.trim();
  startBlank(idea ? idea.slice(0, 80) : "Untitled book");
});

document.getElementById("letsStart").addEventListener("click", async () => {
  if (method === "blank" && !pendingFile) {
    await startBlank(document.getElementById("idea")?.value.trim() || "Untitled book");
    return;
  }
  const file = pendingFile || srcCreate.files[0] || srcInput.files[0];
  if (!file) {
    document.getElementById("importModal").showModal();
    return;
  }
  try { await processFile(file); } catch (err) { console.error(err); }
});

document.getElementById("importNext").addEventListener("click", async () => {
  document.getElementById("importModal").close();
  const file = pendingFile || srcCreate.files[0] || srcInput.files[0];
  if (!file) {
    showScreen("create");
    return;
  }
  try { await processFile(file); } catch (err) { console.error(err); }
});
document.getElementById("importClose").addEventListener("click", () => document.getElementById("importModal").close());

document.getElementById("methodBtn").addEventListener("click", () => {
  method = method === "blank" ? "import" : "blank";
  document.getElementById("methodBtn").textContent = method === "blank" ? "Start from scratch" : "Import from Word or PDF";
  document.getElementById("createFileBox").style.display = method === "blank" ? "none" : "";
});
document.getElementById("kindBtn").addEventListener("click", () => {
  const btn = document.getElementById("kindBtn");
  btn.textContent = btn.textContent === "eBook" ? "Print book" : "eBook";
});
document.getElementById("formatBtn").addEventListener("click", () => {
  document.getElementById("formatModal").showModal();
});
document.querySelectorAll("[data-close-format]").forEach((b) => b.addEventListener("click", () => document.getElementById("formatModal").close()));
document.querySelectorAll(".fmt:not(.locked)").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".fmt").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
  });
});
document.getElementById("formatNext").addEventListener("click", () => {
  document.getElementById("formatModal").close();
  document.getElementById("formatBtn").textContent = "PDF eBook";
});

document.getElementById("previewClose").addEventListener("click", () => previewModal.close());
document.getElementById("previewUse").addEventListener("click", () => {
  const tpl = templates.find((t) => t.id === previewingId);
  if (tpl) selectTemplate(tpl.id, tpl.name);
  previewModal.close();
  applySelectedTemplate();
});
document.getElementById("previewWeb").addEventListener("click", () => {
  if (previewingId) window.open("/api/templates/" + encodeURIComponent(previewingId) + "/preview", "_blank");
});
document.getElementById("previewPdf")?.addEventListener("click", () => {
  alert("Publish your book from the editor to download the PDF preview.");
});
document.getElementById("useTpl").addEventListener("click", applySelectedTemplate);
document.getElementById("tplBack").addEventListener("click", (e) => {
  e.preventDefault();
  if (jobFromUrl) goEditor(jobFromUrl, "write");
  else { showScreen("home"); history.pushState({}, "", "/"); }
});
document.getElementById("tplSearch").addEventListener("input", () => renderGallery(visibleTemplates(), selectedId));

document.getElementById("search").addEventListener("input", () => {
  if (!document.getElementById("screen-templates").classList.contains("hidden")) {
    document.getElementById("tplSearch").value = document.getElementById("search").value;
    renderGallery(visibleTemplates(), selectedId);
  }
});

async function loadSample(kind) {
  const url = kind === "word" ? "/api/sample-word" : "/api/sample-pdf";
  const name = kind === "word" ? "sample-handbook.docx" : "sample-handbook.pdf";
  const type = kind === "word"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";
  if (statusEl) statusEl.textContent = "Downloading sample…";
  const res = await fetch(url);
  if (!res.ok) return;
  const blob = await res.blob();
  const file = new File([blob], name, { type });
  setPending(file);
  method = "import";
  showScreen("create");
  history.pushState({}, "", "/?create=1");
  document.getElementById("importModal").showModal();
}
document.getElementById("tryPdf").addEventListener("click", () => loadSample("pdf"));
document.getElementById("tryWord").addEventListener("click", () => loadSample("word"));

function showBuiltinGallery() {
  templates = window.EPDF_TEMPLATES || templates;
  const def = (templates[0] && templates[0].id) || "cream-handbook";
  selectedId = def;
  renderFilters();
  renderGallery(visibleTemplates(), def);
  const current = templates.find((t) => t.id === def);
  if (current) selectTemplate(current.id, current.name);
}

async function loadRecent() {
  const grid = document.getElementById("recentGrid");
  if (!grid) return;
  try {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    const jobs = (data.jobs || []).slice(0, 4);
    if (!jobs.length) {
      grid.innerHTML = "<p class='muted'>No projects yet. Import a file or start from scratch.</p>";
      return;
    }
    grid.innerHTML = "";
    jobs.forEach((j) => {
      const card = document.createElement("article");
      card.className = "job-card";
      const when = j.updated
        ? new Date(j.updated).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
        : "";
      const tplName = j.template_id
        ? (templates.find((t) => t.id === j.template_id)?.name || j.template_id.replace(/-/g, " "))
        : "";
      const pages = j.page_count ? `${j.page_count} pages` : "Draft";
      card.innerHTML = `
        <div class="job-book">
          <span class="job-spine"></span>
          <div class="job-cover" style="background:${jobGradient(j.id)}">
            ${tplName ? `<span class="job-badge">${escHtml(tplName)}</span>` : ""}
            <div class="job-cover-inner"><strong>${escHtml(j.title || "Untitled")}</strong></div>
            <div class="job-hover">
              <button type="button" data-preview title="Review">Preview</button>
              <button type="button" data-open title="Edit">Edit</button>
            </div>
          </div>
        </div>
        <div class="job-meta">
          <h3>${escHtml(j.title || "Untitled")}</h3>
          <span class="job-sub">${pages}${tplName ? " · " + escHtml(tplName) : ""}</span>
          <time>${when}</time>
        </div>`;
      const cover = card.querySelector(".job-cover");
      if (j.template_id && window.EPDF_GALLERY && cover) {
        const thumbWrap = document.createElement("div");
        thumbWrap.className = "job-cover-thumb";
        cover.insertBefore(thumbWrap, cover.firstChild);
        window.EPDF_GALLERY.mountThumb(thumbWrap, j.template_id);
        const inner = card.querySelector(".job-cover-inner");
        if (inner) inner.style.background = "linear-gradient(transparent 45%, rgba(15,23,42,.7))";
      }
      card.querySelector("[data-open]").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        location.href = `/editor?job=${encodeURIComponent(j.id)}&stage=write`;
      });
      card.querySelector("[data-preview]").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const stage = j.template_id ? "review" : "write";
        location.href = `/editor?job=${encodeURIComponent(j.id)}&stage=${stage}`;
      });
      card.addEventListener("click", () => {
        location.href = `/editor?job=${encodeURIComponent(j.id)}&stage=write`;
      });
      grid.appendChild(card);
    });
  } catch {
    grid.innerHTML = "";
  }
}

document.querySelectorAll(".step").forEach((btn) => {
  btn.addEventListener("click", () => {
    const s = Number(btn.dataset.step);
    const job = jobFromUrl || sessionStorage.getItem("epdf_job");
    if (s === 1) { showScreen("create"); history.pushState({}, "", "/?create=1"); }
    if (s === 2 && job) goEditor(job, "write");
    if (s === 3 && job) goEditor(job, "templates");
    else if (s === 3) showScreen("templates");
    if ((s === 4 || s === 5) && job) goEditor(job, s === 4 ? "review" : "publish");
  });
});

showBuiltinGallery();
loadRecent();

(async function init() {
  try {
    const res = await fetch("/api/templates");
    if (res.ok) {
      const data = await res.json();
      if (data.templates && data.templates.length) {
        templates = data.templates;
        const def = data.default_id || templates[0].id;
        selectedId = def;
        renderFilters();
        renderGallery(visibleTemplates(), def);
        const current = templates.find((t) => t.id === def);
        if (current) selectTemplate(current.id, current.name);
      }
    }
  } catch { /* local gallery */ }

  if (params.get("templates") && jobFromUrl) {
    sessionStorage.setItem("epdf_job", jobFromUrl);
    showScreen("templates");
  } else if (params.get("create")) {
    showScreen("create");
  } else {
    showScreen("home");
  }
})();
