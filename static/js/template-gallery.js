/** Fast CSS book covers + helpers (no per-card iframes — those made the picker lag). */
(function () {
  const PAGE_W = 794;
  const PAGE_H = 1123;

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
      "clinic-teal": `<span class="bc-title">Calm care</span><span class="bc-sub">Patient guide</span><div class="mark">+</div>`,
      "studio-red": `<div class="blocks"><i class="blk b1"></i><i class="blk b2"></i><i class="blk b3"></i></div><span class="bc-title">BUSINESS CYCLE</span>`,
      "legrand-research": `<div class="lg-banner"></div><span class="bc-kicker">Research report</span><span class="bc-title">${title}</span><span class="bc-sub">Data mining &amp; machine learning</span><span class="bc-author">${author}</span>`,
      "column-gazette": `<span class="bc-kicker">Gazette</span><span class="bc-title">${title}</span><div class="cols"><span><i></i><i></i><i></i><i></i></span><span><i></i><i></i><i></i><i></i></span></div>`,
    }[id];
    return `<div class="book-cover cover-${id}">${inner || `<span class="bc-title">${title}</span>`}</div>`;
  }

  function mountCover(container, tpl) {
    if (!container || !tpl) return;
    container.innerHTML = coverHtml(tpl);
  }

  function fitThumb(wrap, iframe) {
    const w = wrap.clientWidth || wrap.offsetWidth || 180;
    const scale = w / PAGE_W;
    iframe.style.width = PAGE_W + "px";
    iframe.style.height = PAGE_H + "px";
    iframe.style.transform = "scale(" + scale + ")";
  }

  function mountThumb(container, templateId) {
    if (!container || !templateId) return;
    const tpl = (window.EPDF_TEMPLATES || []).find((t) => t.id === templateId);
    if (tpl) {
      mountCover(container, tpl);
      return;
    }
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "tpl-live-thumb";
    const iframe = document.createElement("iframe");
    iframe.title = "Template cover preview";
    iframe.loading = "lazy";
    iframe.setAttribute("tabindex", "-1");
    iframe.src = "/api/templates/" + encodeURIComponent(templateId) + "/cover";
    wrap.appendChild(iframe);
    container.appendChild(wrap);
    const resize = () => fitThumb(wrap, iframe);
    iframe.addEventListener("load", resize);
    requestAnimationFrame(resize);
  }

  function scrollPreviewFrame(frame, index) {
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win || !doc) return;
    const pages = doc.querySelectorAll(".epdf-page");
    const page = pages[index] || pages[0];
    if (page) page.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildPreviewThumbStrip(strip, tpl, frame, onPick) {
    if (!strip) return;
    strip.innerHTML = "";
    const labels = ["Cover", "Inside", "Chapter", "Back"];
    labels.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = i === 0 ? "on" : "";
      btn.title = label;
      const slot = document.createElement("div");
      slot.className = "tpl-thumb-slot";
      btn.appendChild(slot);
      const caption = document.createElement("em");
      caption.textContent = label;
      btn.appendChild(caption);
      mountCover(slot, tpl);
      btn.addEventListener("click", () => {
        strip.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
        const doc = frame?.contentDocument;
        const pages = doc?.querySelectorAll(".epdf-page");
        let idx = i;
        if (i === 3 && pages?.length) idx = pages.length - 1;
        scrollPreviewFrame(frame, idx);
        if (onPick) onPick(idx);
      });
      strip.appendChild(btn);
    });
  }

  function mountPageMini(container, pageEl) {
    if (!container || !pageEl) return;
    container.innerHTML = "";
    const w = container.clientWidth || 100;
    const scale = w / PAGE_W;
    const h = pageEl.offsetHeight || PAGE_H;
    const wrap = document.createElement("div");
    wrap.className = "mini-page";
    wrap.style.width = PAGE_W + "px";
    wrap.style.height = h + "px";
    wrap.style.transform = "scale(" + scale + ")";
    const clone = pageEl.cloneNode(true);
    clone.querySelectorAll(".epdf-selected").forEach((n) => n.classList.remove("epdf-selected"));
    wrap.appendChild(clone);
    container.appendChild(wrap);
  }

  function pageDoc(headHtml, pageHtml) {
    return (
      "<!DOCTYPE html><html><head>" +
      headHtml +
      '<style id="rv-one">html,body{margin:0;padding:0;background:#fff;overflow:hidden}' +
      ".epdf-page{margin:0!important;box-shadow:none!important;min-height:auto!important}</style></head><body>" +
      pageHtml +
      "</body></html>"
    );
  }

  function fitScaledIframe(container, iframe, pageW, pageH) {
    if (!container || !iframe) return 1;
    const w = container.clientWidth || 100;
    const scale = w / pageW;
    iframe.style.width = pageW + "px";
    iframe.style.height = pageH + "px";
    iframe.style.transform = "scale(" + scale + ")";
    iframe.style.transformOrigin = "top left";
    const wrap = iframe.parentElement;
    if (wrap) wrap.style.height = Math.ceil(pageH * scale) + "px";
    return scale;
  }

  function mountReviewThumb(container, headHtml, pageHtml) {
    if (!container) return;
    container.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.setAttribute("tabindex", "-1");
    iframe.title = "Page thumbnail";
    iframe.srcdoc = pageDoc(headHtml, pageHtml);
    container.appendChild(iframe);
    iframe.addEventListener("load", () => {
      const doc = iframe.contentDocument;
      const page = doc?.querySelector(".epdf-page");
      const ph = page?.offsetHeight || PAGE_H;
      fitScaledIframe(container, iframe, PAGE_W, ph);
    });
  }

  function showReviewPage(mainFrame, viewport, scaleWrap, headHtml, pageHtml, onReady) {
    if (!mainFrame) return;
    mainFrame.srcdoc = pageDoc(headHtml, pageHtml);
    mainFrame.onload = () => {
      const doc = mainFrame.contentDocument;
      const page = doc?.querySelector(".epdf-page");
      const ph = page?.offsetHeight || PAGE_H;
      mainFrame.style.width = PAGE_W + "px";
      mainFrame.style.height = ph + "px";
      if (!viewport || !scaleWrap) {
        if (onReady) onReady(ph);
        return;
      }
      const pad = 32;
      const availW = viewport.clientWidth - pad;
      const availH = viewport.clientHeight - pad - 28;
      const scale = Math.min(availW / PAGE_W, availH / ph, 1);
      scaleWrap.style.width = Math.ceil(PAGE_W * scale) + "px";
      scaleWrap.style.height = Math.ceil(ph * scale) + "px";
      mainFrame.style.transform = "scale(" + scale + ")";
      mainFrame.style.transformOrigin = "top left";
      if (onReady) onReady(ph);
    };
  }

  window.EPDF_GALLERY = {
    coverHtml,
    mountCover,
    mountThumb,
    PAGE_W,
    PAGE_H,
    buildPreviewThumbStrip,
    scrollPreviewFrame,
    mountPageMini,
    mountReviewThumb,
    showReviewPage,
    pageDoc,
  };
})();
