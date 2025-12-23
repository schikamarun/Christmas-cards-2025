/*
  Christmas Cards 2025 — vanilla JS
  - Hash routing for personalization: /#/anna, /#/collection/<c>, /#/collection/<c>/<r>
  - Loads data from /data/collections.json and /data/recipients.json
  - Falls back to embedded sample data for local file:// previews
*/

(() => {
  "use strict";

  const els = {
    envWrap: document.getElementById("envWrap"),
    envelope: document.getElementById("envelope"),
    wax: document.getElementById("wax"),
    openBtn: document.getElementById("openBtn"),
    closeBtn: document.getElementById("closeBtn"),
    replayBtn: document.getElementById("replayBtn"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    waBtn: document.getElementById("waBtn"),
    toast: document.getElementById("toast"),
    routePill: document.getElementById("routePill"),
    localNote: document.getElementById("localNote"),

    toLine: document.getElementById("toLine"),
    subLine: document.getElementById("subLine"),

    kicker: document.getElementById("kicker"),
    headline: document.getElementById("headline"),
    meta: document.getElementById("meta"),
    message: document.getElementById("message"),
    signature: document.getElementById("signature"),
    footerNote: document.getElementById("footerNote"),

    sparkleCanvas: document.getElementById("sparkleCanvas"),
  };

  const DEFAULT_COPY = {
    title: "Merry Christmas 💌",
    subtitle: "A little letter for you",
    message: "Wishing you a warm, peaceful Christmas and a beautiful start to the new year.",
    footerNote: "",
  };

  const THEMES = new Set(["classic", "midnight", "festive"]);

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function normalizeHash(hash) {
    // Accept: "", "#", "#/", "#/anna", "# /anna" (rare)
    if (!hash) return "#/";
    let h = hash.trim();
    if (h === "#") return "#/";
    if (h.startsWith("#")) h = h.slice(1);
    if (!h.startsWith("/")) h = "/" + h;
    // Ensure leading '/'
    h = h.replace(/\s+/g, "");
    if (h === "/") return "#/";
    return "#" + h;
  }

  function parseRoute() {
    // Returns { type, collectionSlug, recipientSlug }
    const normalized = normalizeHash(window.location.hash);
    const path = normalized.slice(1); // remove '#'
    const parts = path.split("/").filter(Boolean);

    // / => []
    if (parts.length === 0) {
      return { type: "home" };
    }

    if (parts[0] === "collection") {
      if (parts.length === 2) {
        return { type: "collection", collectionSlug: parts[1] };
      }
      if (parts.length === 3) {
        return { type: "recipient", collectionSlug: parts[1], recipientSlug: parts[2] };
      }
      return { type: "home" };
    }

    if (parts.length === 1) {
      return { type: "recipient", recipientSlug: parts[0] };
    }

    return { type: "home" };
  }

  function safeText(value, fallback = "") {
    if (typeof value !== "string") return fallback;
    return value;
  }

  function escapeText(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderParagraphs(container, text) {
    const normalized = safeText(text, "").replace(/\r\n/g, "\n").trim();
    const parts = normalized ? normalized.split(/\n\n+/) : [];

    const html = parts.length
      ? parts.map((p) => `<p>${escapeText(p).replace(/\n/g, "<br>")}</p>`).join("")
      : `<p>${escapeText(DEFAULT_COPY.message)}</p>`;

    container.innerHTML = html;
  }

  function pickTheme(preferred, fallback) {
    const t = (preferred || "").toLowerCase();
    if (THEMES.has(t)) return t;
    const f = (fallback || "").toLowerCase();
    if (THEMES.has(f)) return f;
    return "classic";
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      els.toast.classList.remove("show");
    }, 1600);
  }

  function setOpen(isOpen) {
    document.body.classList.toggle("is-open", isOpen);
    if (isOpen) {
      // Move focus into the card for keyboard users
      window.setTimeout(() => {
        const card = document.getElementById("card");
        card && card.focus({ preventScroll: true });
      }, 500);
    }
  }

  function replayOpen() {
    setOpen(false);
    window.setTimeout(() => setOpen(true), prefersReducedMotion() ? 0 : 220);
  }

  function isLocalFile() {
    return window.location.protocol === "file:";
  }

  const SAMPLE_DATA = {
    collections: {
      "christmas-2025": {
        title: DEFAULT_COPY.title,
        subtitle: DEFAULT_COPY.subtitle,
        defaultTheme: "classic",
        footerNote: "Wishing you warmth and light this season.",
      },
    },
    recipients: {
      defaultCollection: "christmas-2025",
      recipients: {
        "christmas-2025": {
          anna: {
            name: "Anna",
            message: "Wishing you a warm Christmas.\n\n(Loaded from sample data because fetch() may be blocked in file://.)",
            signature: "— Dominik",
            theme: "classic",
            date: "2025-12-24",
          },
        },
      },
    },
  };

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  async function loadData() {
    try {
      const [collections, recipients] = await Promise.all([
        loadJson("data/collections.json"),
        loadJson("data/recipients.json"),
      ]);
      els.localNote.hidden = true;
      return { collections, recipients };
    } catch (e) {
      // GitHub Pages works fine; file:// often blocks fetch.
      if (isLocalFile()) {
        els.localNote.hidden = false;
        return { collections: SAMPLE_DATA.collections, recipients: SAMPLE_DATA.recipients };
      }
      // Hosted but failed: fall back anyway (better than blank).
      els.localNote.hidden = true;
      console.warn("Failed to load JSON; using sample fallback.", e);
      return { collections: SAMPLE_DATA.collections, recipients: SAMPLE_DATA.recipients };
    }
  }

  function getBaseUrl() {
    // Works for GitHub Pages subpaths AND local file:// preview.
    // - Hosted: base is origin + directory (keeps repo subpath)
    // - file://: origin is "null"; base should include the actual file path
    const { protocol, origin, pathname, href } = window.location;
    if (protocol === "file:" || origin === "null") {
      return href.split("#")[0];
    }
    const basePath = pathname.endsWith("/") ? pathname : pathname.replace(/[^/]+$/, "");
    return origin + basePath;
  }

  function buildRecipientUrl(route) {
    const base = getBaseUrl();
    const hash = route.hash || "#/";
    return base + hash;
  }

  function buildWhatsAppUrl(text) {
    const encoded = encodeURIComponent(text);
    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

    // wa.me works everywhere, but on desktop it may not open the web client reliably.
    // Use web.whatsapp.com on desktop.
    if (isMobile) return `https://wa.me/?text=${encoded}`;
    return `https://web.whatsapp.com/send?text=${encoded}`;
  }

  function applyPersonalization({ collection, recipient, route }) {
    const title = safeText(collection?.title, DEFAULT_COPY.title);
    const subtitle = safeText(collection?.subtitle, DEFAULT_COPY.subtitle);
    const footerNote = safeText(collection?.footerNote, DEFAULT_COPY.footerNote);

    const name = safeText(recipient?.name, "");
    const message = safeText(recipient?.message, "");
    const signature = safeText(recipient?.signature, "—");
    const date = safeText(recipient?.date, "");

    const theme = pickTheme(recipient?.theme, collection?.defaultTheme);
    document.body.setAttribute("data-theme", theme);

    // Envelope address
    els.toLine.textContent = name ? `To: ${name}` : "To: You";
    els.subLine.textContent = subtitle;

    // Card copy
    els.kicker.textContent = title;
    els.headline.textContent = subtitle;

    const metaBits = [];
    if (name) metaBits.push(name);
    if (date) metaBits.push(date);
    els.meta.textContent = metaBits.join(" • ");

    renderParagraphs(els.message, message || DEFAULT_COPY.message);
    els.signature.textContent = signature || "—";
    els.footerNote.textContent = footerNote;

    // Route pill
    els.routePill.textContent = route.display;

    // Share buttons
    const url = buildRecipientUrl({ hash: route.hash });
    const shareName = name || "there";
    const shareText = `Hey ${shareName}! 🎄💌 I made you a Christmas letter — open it here: ${url}`;
    els.waBtn.href = buildWhatsAppUrl(shareText);

    els.copyLinkBtn.dataset.copyValue = url;
    els.copyLinkBtn.setAttribute("aria-label", `Copy link: ${url}`);
  }

  function resolveDataForRoute(data, route) {
    const collections = data.collections || {};
    const recipientsRoot = data.recipients || {};
    const defaultCollectionSlug = recipientsRoot.defaultCollection || Object.keys(collections)[0] || "christmas-2025";

    if (route.type === "collection") {
      const collectionSlug = route.collectionSlug || defaultCollectionSlug;
      const collection = collections[collectionSlug] || collections[defaultCollectionSlug];
      return {
        collectionSlug,
        recipientSlug: "",
        collection,
        recipient: null,
        theme: collection?.defaultTheme,
      };
    }

    if (route.type === "recipient") {
      const collectionSlug = route.collectionSlug || defaultCollectionSlug;
      const recipientSlug = route.recipientSlug || "";
      const collection = collections[collectionSlug] || collections[defaultCollectionSlug];

      const group = recipientsRoot.recipients?.[collectionSlug] || recipientsRoot.recipients?.[defaultCollectionSlug] || {};
      const recipient = group[recipientSlug] || null;

      return { collectionSlug, recipientSlug, collection, recipient };
    }

    // home
    const collection = collections[defaultCollectionSlug] || collections[Object.keys(collections)[0]];
    return { collectionSlug: defaultCollectionSlug, recipientSlug: "", collection, recipient: null };
  }

  function formatRouteDisplay(route) {
    const normalized = normalizeHash(window.location.hash);
    return normalized;
  }

  function formatRouteHash(route) {
    // Keep hash stable and canonical
    if (route.type === "collection") {
      return `#/collection/${route.collectionSlug}`;
    }
    if (route.type === "recipient") {
      if (route.collectionSlug) return `#/collection/${route.collectionSlug}/${route.recipientSlug}`;
      return `#/${route.recipientSlug}`;
    }
    return "#/";
  }

  function withCanonicalHash(route) {
    const hash = formatRouteHash(route);
    const display = formatRouteDisplay(route);
    return { ...route, hash, display };
  }

  async function renderFromHash(data) {
    const routeRaw = parseRoute();
    const route = withCanonicalHash(routeRaw);

    // Keep the URL tidy (but don't spam history)
    if (window.location.hash !== route.hash) {
      window.history.replaceState(null, "", route.hash);
    }

    const resolved = resolveDataForRoute(data, route);
    applyPersonalization({ ...resolved, route });

    // If recipient exists, auto-open after a short delay (premium feel)
    // but only on first load and only if user hasn't opened yet.
    if (!renderFromHash._didAuto && resolved.recipient && !prefersReducedMotion()) {
      renderFromHash._didAuto = true;
      window.setTimeout(() => setOpen(true), 420);
    }
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // ignore; fallback below
    }

    // Fallback: temporary textarea
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }

  function setupTilt() {
    // Very subtle parallax tilt; disabled on reduced-motion.
    if (prefersReducedMotion()) return;

    const wrap = els.envWrap;
    const env = els.envelope;
    if (!wrap || !env) return;

    let active = false;

    function onMove(ev) {
      if (!active) return;
      const rect = wrap.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width - 0.5;
      const y = (ev.clientY - rect.top) / rect.height - 0.5;
      const rx = (-y * 2.2).toFixed(3);
      const ry = (x * 3.4).toFixed(3);
      env.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    }

    function onEnter() {
      active = true;
      wrap.classList.add("tilt");
    }

    function onLeave() {
      active = false;
      wrap.classList.remove("tilt");
      env.style.transform = "";
    }

    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("pointermove", onMove);
  }

  // Light sparkle particles on canvas
  function setupSparkle() {
    const c = els.sparkleCanvas;
    if (!c || prefersReducedMotion()) return () => {};

    const ctx = c.getContext("2d", { alpha: true });
    if (!ctx) return () => {};

    const particles = [];
    let raf = 0;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = c.getBoundingClientRect();
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(n) {
      const rect = c.getBoundingClientRect();
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          r: 0.8 + Math.random() * 1.8,
          a: 0.0,
          da: 0.008 + Math.random() * 0.018,
          vy: 0.14 + Math.random() * 0.24,
          vx: -0.06 + Math.random() * 0.12,
        });
      }
    }

    function tick() {
      const rect = c.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const isOpen = document.body.classList.contains("is-open");
      if (isOpen && particles.length < 56) spawn(2);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.da;

        const alpha = Math.sin(Math.min(Math.PI, p.a * Math.PI)) * 0.35;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        if (p.y > rect.height + 24 || p.x < -24 || p.x > rect.width + 24 || p.a > 2.2) {
          particles.splice(i, 1);
        }
      }

      raf = window.requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }

  function setupEvents(data) {
    const open = () => setOpen(true);
    const close = () => setOpen(false);

    els.openBtn?.addEventListener("click", open);
    els.closeBtn?.addEventListener("click", close);
    els.replayBtn?.addEventListener("click", replayOpen);

    els.wax?.addEventListener("click", open);

    els.copyLinkBtn?.addEventListener("click", async () => {
      const url = els.copyLinkBtn.dataset.copyValue || window.location.href;
      const ok = await copyText(url);
      showToast(ok ? "Link copied." : "Couldn’t copy—select and copy manually.");
    });

    // Keyboard: Escape closes
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    });

    window.addEventListener("hashchange", () => {
      renderFromHash(data);
    });
  }

  async function main() {
    const data = await loadData();
    setupEvents(data);
    setupTilt();
    setupSparkle();

    await renderFromHash(data);

    // If user directly loads with a recipient route, keep the envelope closed
    // until personalization is applied.
    setOpen(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
