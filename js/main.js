import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { initLang, applyStaticTranslations, t, pick } from "./i18n.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- RE-RENDER TEARDOWN REGISTRY ----
// renderAll() (see CONTENT LOADING below) re-runs on every language switch — cheap since
// both languages already live in the same fetched JSON, no re-fetch needed. But several
// init*() functions build closures (carousel autoplay timers, modal keydown listeners,
// reveal IntersectionObservers) that would otherwise stack a duplicate copy on top of the
// previous render's. Those functions register a cleanup callback here; runTeardowns()
// clears all of them right before a re-render starts.
const teardowns = [];
function runTeardowns() {
  teardowns.splice(0).forEach((fn) => { try { fn(); } catch (err) { /* one bad teardown shouldn't block the rest */ } });
}

const header = document.querySelector("[data-header]");
const toggle = document.querySelector(".menu-toggle");
const menu = document.querySelector("#primary-menu");
const sectionIds = ["about", "team", "training", "schedule", "records", "news", "notices", "gallery", "join"];
const contentSections = sectionIds.map((id) => document.getElementById(id));

contentSections.forEach((section) => section.classList.add("content-section"));
const setMenu = (open) => { menu.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open)); document.body.classList.toggle("menu-open", open); };
toggle.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));

// Reassigned once initNewsVideoAutoStop() runs (see below); a no-op until then so early
// calls to showPage() (e.g. the initial page load a few lines down) never throw.
let pauseNewsVideo = () => {};

// Reassigned once initSessionModal() runs (see WEEKLY TRAINING SESSIONS below); a no-op
// until then so an early click can never throw.
let openSessionModal = () => {};

function showPage(id) {
  const isDetail = sectionIds.includes(id);
  document.body.classList.toggle("detail-mode", isDetail);
  contentSections.forEach((section) => section.classList.toggle("is-current", section.id === id));
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  pauseNewsVideo();
}

document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener("click", (event) => {
  const id = link.getAttribute("href").slice(1);
  if (!sectionIds.includes(id) && id !== "top") return;
  event.preventDefault(); setMenu(false); window.history.pushState(null, "", `#${id}`); showPage(id);
}));
window.addEventListener("popstate", () => showPage(window.location.hash.slice(1)));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") setMenu(false); });
window.addEventListener("scroll", () => header.classList.toggle("is-scrolled", window.scrollY > 32), { passive: true });
showPage(window.location.hash.slice(1));
document.querySelector("[data-year]").textContent = new Date().getFullYear();
const brandName = document.querySelector(".brand span");
if (brandName && brandName.firstChild) brandName.firstChild.textContent = "서울대학교 수영부";

// ---- ADMIN 메뉴 노출 ----
// /admin/(Sveltia CMS)과 사이트 루트는 동일 오리진이므로 로그인 세션이 있으면
// localStorage에 "sveltia-cms" 접두사 키가 남는다. 순수 표시용 장치일 뿐 —
// 실제 접근 통제는 GitHub 레포 쓰기 권한이 전담하므로 여기서 틀려도 보안엔 영향 없다.
(function initAdminLinkVisibility() {
  const adminLink = document.querySelector("[data-admin-link]");
  if (!adminLink) return;
  try {
    const hasSession = Object.keys(window.localStorage).some((key) => key.toLowerCase().includes("sveltia"));
    adminLink.hidden = !hasSession;
  } catch (err) {
    // localStorage 접근 불가(프라이빗 모드 등) 시 안전하게 숨김 유지
  }
})();

// ---- NEWS VIDEO AUTO-STOP ----
// The embedded YouTube video (static markup in #news, not JSON-driven) keeps playing in
// the background if the user scrolls it out of view or navigates to another section —
// this stops it via the YouTube postMessage API in both cases. Only ever sends "pause",
// never touches autoplay/seek, and never reaches into the iframe's own player UI.
function initNewsVideoAutoStop() {
  const iframe = document.querySelector(".news-video-frame iframe");
  if (!iframe) return;
  const playerUrl = new URL(iframe.src);
  if (window.location.protocol !== "file:") {
    playerUrl.searchParams.set("origin", window.location.origin);
    iframe.src = playerUrl.toString();
  }
  const playerOrigin = playerUrl.origin;
  let playerReady = false;
  let pausePending = false;
  let retryTimer = null;
  let retryCount = 0;

  function sendPause() {
    iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), playerOrigin);
  }

  function retryPause() {
    if (!pausePending || playerReady) return;
    if (retryCount >= 12) { retryTimer = null; sendPause(); return; }
    retryCount += 1;
    retryTimer = window.setTimeout(retryPause, 250);
  }

  function pause() {
    if (!iframe.src) return;
    pausePending = true;
    try {
      if (playerReady) sendPause();
      else if (!retryTimer) retryPause();
    } catch (err) {
      // The ready handler or bounded retry path will make a later attempt.
    }
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== playerOrigin || event.source !== iframe.contentWindow) return;
    let payload = event.data;
    try { if (typeof payload === "string") payload = JSON.parse(payload); } catch { return; }
    if (payload?.event !== "onReady") return;
    playerReady = true;
    if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = null; }
    if (pausePending) sendPause();
  });

  iframe.addEventListener("load", () => { playerReady = false; retryCount = 0; });

  pauseNewsVideo = pause;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (!entry.isIntersecting) pause(); });
    }, { threshold: 0 });
    observer.observe(iframe);
  }
}
initNewsVideoAutoStop();

// ---- HERO PARALLAX ----
// Desktop/tablet only. Background image is pinned via CSS `background-attachment:fixed`
// (see .hero in css/style.css); this just fades + lifts the hero text/logo as the user
// scrolls through the hero's own height, so the next section reads as rising up over it.
// Disabled on mobile (≤760px, matching the site's other mobile breakpoints) and under
// prefers-reduced-motion — in both cases the CSS custom properties are cleared so
// .hero-content falls back to its normal static position/opacity. Never touches
// anything under .home-news-carousel (the TEAM UPDATES slider).
(function initHeroParallax() {
  const hero = document.querySelector(".hero");
  const heroContent = document.querySelector(".hero-content");
  if (!hero || !heroContent) return;

  const MAX_SHIFT_PX = 90;
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ticking = false;

  function clearParallax() {
    heroContent.style.removeProperty("--parallax-shift");
    heroContent.style.removeProperty("--parallax-opacity");
  }

  function applyParallax() {
    ticking = false;
    if (mobileQuery.matches || reducedMotionQuery.matches || document.body.classList.contains("detail-mode")) {
      clearParallax();
      return;
    }
    const heroHeight = hero.offsetHeight || window.innerHeight;
    const progress = Math.min(1, Math.max(0, window.scrollY / heroHeight));
    heroContent.style.setProperty("--parallax-shift", `${-progress * MAX_SHIFT_PX}px`);
    heroContent.style.setProperty("--parallax-opacity", String(1 - progress));
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyParallax);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  mobileQuery.addEventListener("change", applyParallax);
  reducedMotionQuery.addEventListener("change", applyParallax);
  applyParallax();
})();

// ---- SCHEDULE ----
// 학교/단체 교류전 로고 매핑(제목 키워드 매칭)은 콘텐츠가 아니라 표현 설정이라
// content/schedule.json으로 옮기지 않고 여기 그대로 둔다.
const scheduleLogoRules = [
  { match: "카이스트", logos: [
      { src: "university-logo.png", alt: "서울대학교" },
      { src: "kaori.png", alt: "KAIST 가오리" }
    ] },
  { match: "PolyU", logos: [
      { src: "university-logo.png", alt: "서울대학교" },
      { src: "polyu.png", alt: "PolyU" }
    ] },
  { match: "한국외대", logos: [
      { src: "university-logo.png", alt: "서울대학교" },
      { src: "hufs.png", alt: "한국외국어대학교" }
    ] }
];
function getScheduleLogos(title) {
  const rule = scheduleLogoRules.find((r) => title.includes(r.match));
  return rule ? rule.logos : [];
}
function scheduleStatusClass(status) {
  if (status === "JOINT TRAINING") return "joint-training";
  if (status === "EXCHANGE EVENT") return "exchange";
  return "competition";
}
function renderScheduleRow(event) {
  const { type } = event;
  // Logo matching keys off the raw (Korean) title, not the translated display title —
  // scheduleLogoRules' match strings ("카이스트" etc.) only ever appear in event.title.
  const logos = getScheduleLogos(event.title);
  const logosHtml = logos.length
    ? logos.map((l, i) => `${i > 0 ? '<span class="schedule-logo-mark">×</span>' : ""}<img src="./assets/images/${l.src}" alt="${l.alt}" loading="lazy">`).join("")
    : "";
  const dateLabel = pick(event, "dateLabel");
  const title = pick(event, "title");
  const result = pick(event, "result");
  return `<article class="schedule-row" role="row"><time>${dateLabel}</time><div class="schedule-logos${logos.length ? " has-logos" : ""}">${logosHtml}</div><div><p class="status ${scheduleStatusClass(type)}">${type}</p><h3>${title}</h3></div><p class="schedule-result">${result || ""}</p></article>`;
}
function renderSeasonAccordion(year, events, isOpen) {
  const rows = events.map(renderScheduleRow).join("");
  return `<div class="season-accordion" data-season="${year}"><button class="season-toggle" type="button" aria-expanded="${isOpen}" aria-controls="season-${year}"><span>${year} SEASON</span><span class="season-indicator">${isOpen ? "−" : "+"}</span></button><div class="season-events" id="season-${year}" role="region"${isOpen ? "" : " hidden"}>${rows}</div></div>`;
}
function renderSchedule(events) {
  const scheduleSeasonsEl = document.querySelector("[data-schedule-seasons]");
  if (!scheduleSeasonsEl) return;
  const years = Array.from(new Set(events.map((e) => e.startDate.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
  scheduleSeasonsEl.innerHTML = years
    .map((year, i) => renderSeasonAccordion(year, events.filter((e) => e.startDate.startsWith(year)), i === 0))
    .join("");
  scheduleSeasonsEl.querySelectorAll(".season-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      const willOpen = panel.hasAttribute("hidden");
      panel.toggleAttribute("hidden", !willOpen);
      btn.setAttribute("aria-expanded", String(willOpen));
      btn.querySelector(".season-indicator").textContent = willOpen ? "−" : "+";
    });
  });
}

// ---- RECORDS ----
// "24.43" / "1:07.35" 두 형식을 모두 정렬 가능한 초 단위로 변환. time 하나만 입력하면
// 되므로 과거처럼 seconds를 손으로 이중 입력하다 값이 어긋나는 일이 없어진다.
function timeToSeconds(time) {
  const parts = String(time).split(":");
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
  return Number(time);
}
function recordTagClass(tag) {
  if (tag === "PB") return "record-badge pb";
  if (tag === "GR") return "record-badge gr";
  if (tag === "GOLD") return "result-tag gold";
  return "result-tag";
}
function renderRecordTags(entry) {
  return (entry.tags || []).map((tag) => `<span class="${recordTagClass(tag)}">${tag}</span>`).join("");
}
const BASE_RECORD_ORDER = ["50 FREE", "100 FREE", "50 FLY", "100 FLY", "50 BREAST", "100 BREAST"];
function renderRecords(recordEntries, relayEntries) {
  const recordsAppEl = document.querySelector("[data-records-app]");
  if (!recordsAppEl) return;

  const recordsByEvent = {};
  recordEntries.forEach((r) => { (recordsByEvent[r.event] = recordsByEvent[r.event] || []).push(r); });
  // 새 종목이 CMS로 들어와도 조용히 사라지지 않도록, 알려진 순서 뒤에 자동으로 붙인다.
  const extraEvents = Object.keys(recordsByEvent).filter((e) => !BASE_RECORD_ORDER.includes(e));
  const recordEventOrder = [...BASE_RECORD_ORDER, ...extraEvents, "RELAY"];

  function renderRecordsTable(eventName) {
    if (eventName === "RELAY") {
      const rows = relayEntries.slice().sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time)).map((r) =>
        `<tr><td>${pick(r, "event")}</td><td>${r.team}</td><td>${r.time}</td><td>${pick(r, "meet")}</td><td>${r.date}</td><td>${pick(r, "members")}</td></tr>`
      ).join("");
      return `<p class="record-event-name">RELAY</p><div class="table-wrap"><table class="performance-table"><thead><tr><th>EVENT</th><th>TEAM</th><th>TIME</th><th>MEET</th><th>DATE</th><th>SWIMMERS</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    const entries = (recordsByEvent[eventName] || []).slice().sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
    const rows = entries.map((r) => {
      const meet = pick(r, "meet");
      const detail = pick(r, "detail");
      return `<tr><td>${pick(r, "athlete")}</td><td>${r.time}</td><td>${renderRecordTags(r)}</td><td>${meet}${detail ? ` · ${detail}` : ""}</td><td>${r.date}</td></tr>`;
    }).join("");
    return `<p class="record-event-name">${eventName}</p><div class="table-wrap"><table class="performance-table"><thead><tr><th>ATHLETE</th><th>TIME</th><th>RESULT</th><th>MEET</th><th>DATE</th></tr></thead><tbody>${rows}</tbody></table></div><p class="records-note">${t("records.sortNote")}</p>`;
  }

  const tabsHtml = recordEventOrder.map((name, i) => `<button type="button" class="${i === 0 ? "is-active" : ""}" data-event-tab="${name}">${name}</button>`).join("");
  recordsAppEl.innerHTML = `<div class="records-toolbar"><div class="event-tabs" role="tablist" aria-label="${t("records.eventTabsAria")}">${tabsHtml}</div></div><div data-records-table>${renderRecordsTable(recordEventOrder[0])}</div>`;
  const tableWrapEl = recordsAppEl.querySelector("[data-records-table]");
  recordsAppEl.querySelectorAll("[data-event-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      recordsAppEl.querySelectorAll("[data-event-tab]").forEach((b) => b.classList.toggle("is-active", b === btn));
      tableWrapEl.innerHTML = renderRecordsTable(btn.dataset.eventTab);
    });
  });
}

// ---- IMAGE PATHS ----
// Hand-authored JSON stores bare filenames ("trainp01.webp"); the CMS media widget
// (admin/config.yml, public_folder: "/assets/images") writes root-absolute paths
// ("/assets/images/trainp01.webp") instead. assetPath() normalizes either form so
// both old and CMS-uploaded entries resolve to the same URL.
function assetPath(name) {
  if (!name) return "";
  if (/^(https?:)?\//.test(name) || name.startsWith("./") || name.startsWith("../")) return name;
  return `./assets/images/${name}`;
}

// ---- GALLERY ----
// Every gallery photo *may* ship a ~900px-wide "-sm" WebP companion next to the ~1800px
// full version. CMS uploads won't have one, so srcset is only added when both w/sw are
// present in the data — otherwise we fall back to a plain <img> instead of a 404 srcset.
const GALLERY_SIZES = "(max-width: 760px) 92vw, 31vw";
function galleryImgHtml(card, title) {
  if (!card.image) return card.fallback ? '<img src="./assets/images/university-logo.png" alt="Seoul National University logo">' : "PHOTO<br>PENDING";
  const large = assetPath(card.image);
  if (card.w && card.sw) {
    const small = assetPath(card.image.replace(".webp", "-sm.webp"));
    return `<img src="${large}" srcset="${small} ${card.sw}w, ${large} ${card.w}w" sizes="${GALLERY_SIZES}" alt="${title}" loading="lazy">`;
  }
  return `<img src="${large}" alt="${title}" loading="lazy">`;
}
function renderGallery(cards) {
  const galleryGrid = document.querySelector("#gallery .photo-grid");
  const galleryFilter = document.querySelector("#gallery .gallery-filter");
  if (!galleryGrid || !galleryFilter) return;
  galleryGrid.innerHTML = cards.map((card) => {
    const title = pick(card, "title");
    const meta = pick(card, "meta");
    return `<figure class="gallery-item" data-category="${card.category}"><div class="gallery-media ${card.image ? "" : "gallery-media--placeholder"}">${galleryImgHtml(card, title)}</div><figcaption><p class="gallery-card-category">${card.label}</p><h3 class="gallery-card-title">${title}</h3><span class="gallery-card-meta">${meta}</span></figcaption></figure>`;
  }).join("") + `<p class="gallery-empty" hidden>${t("gallery.empty")}</p>`;
  // Unlike galleryGrid, these filter buttons are static markup in index.html (not
  // regenerated here), so a re-render (e.g. on langchange) would stack a second listener
  // on the same nodes. Cloning replaces each button with an identical, listener-free copy
  // before attaching this render's handler.
  galleryFilter.querySelectorAll("button").forEach((original) => {
    const button = original.cloneNode(true);
    original.replaceWith(button);
    button.addEventListener("click", () => {
      const category = button.textContent.trim().toLowerCase();
      galleryFilter.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
      let visible = 0;
      galleryGrid.querySelectorAll(".gallery-item").forEach((card) => { const show = category === "all" || card.dataset.category === category; card.hidden = !show; if (show) visible += 1; });
      galleryGrid.querySelector(".gallery-empty").hidden = visible !== 0;
    });
  });
}

// ---- NEWS ----
// content/news.json 하나가 홈 "TEAM UPDATES" 캐러셀과 #news 섹션 캐러셀을 모두 먹인다
// (과거엔 이 둘이 HTML/JS에 따로 중복 저장되어 있었다). 두 캐러셀은 정렬 기준이 다르다:
// 홈 캐러셀은 큐레이션된 게재 순서(JSON 배열 순서, 첫 항목이 "리드" 카드)를 그대로 쓰고,
// #news 섹션 캐러셀은 최신순 정렬이다.
function homeNewsCardHtml(item, isLead) {
  const leadAttr = isLead ? ' class="home-news-lead"' : "";
  const img = `<img src="${assetPath(item.image)}" alt="${pick(item, "alt")}" loading="lazy">`;
  const meta = `<p>${pick(item, "dateLabel")} · ${item.category}</p>`;
  const heading = `<h3>${pick(item, "title")}</h3>`;
  if (item.result) {
    return `<article${leadAttr}>${img}${meta}${heading}<span>${pick(item, "result")}</span><a href="#records">VIEW RESULTS ↗</a></article>`;
  }
  return `<article${leadAttr}>${img}${meta}${heading}<a href="#schedule">VIEW SCHEDULE ↗</a></article>`;
}
function renderHomeNewsCarousel(items) {
  const track = document.querySelector("[data-carousel-track]");
  if (!track) return;
  track.innerHTML = items.map((item, i) => homeNewsCardHtml(item, i === 0)).join("");
}

function renderNewsSection(items) {
  const newsGrid = document.querySelector("#news .news-grid");
  if (!newsGrid) return;
  const sorted = items.slice().sort((a, b) => b.startDate.localeCompare(a.startDate));
  const slidesHtml = sorted.map((item) => {
    const body = pick(item, "body");
    return `<article class="feature-news" data-news-body="${(body || "").replace(/"/g, "&quot;")}"><div class="news-image"><img src="${assetPath(item.image)}" alt="${pick(item, "alt")}" loading="lazy"></div><div><p class="news-meta">${pick(item, "dateLabel")} · ${item.category}</p><h3>${pick(item, "title")}</h3><a href="#" data-news-read-more aria-haspopup="dialog">READ MORE ↗</a></div></article>`;
  }).join("");
  newsGrid.innerHTML = `<div class="news-carousel-wrap"><div class="news-carousel" data-news-carousel aria-roledescription="carousel" aria-label="${t("carousel.newsAria")}"><div class="news-carousel-viewport"><div class="news-carousel-track" data-news-carousel-track>${slidesHtml}</div></div><button type="button" class="news-carousel-arrow news-carousel-arrow-prev" data-news-carousel-prev aria-label="${t("carousel.prev")}"><span aria-hidden="true">‹</span></button><button type="button" class="news-carousel-arrow news-carousel-arrow-next" data-news-carousel-next aria-label="${t("carousel.next")}"><span aria-hidden="true">›</span></button></div><div class="news-carousel-controls"><div class="news-carousel-dots" data-news-carousel-dots role="tablist" aria-label="${t("carousel.dotsAria")}"></div><button type="button" class="news-carousel-toggle" data-news-carousel-toggle aria-pressed="false"><span aria-hidden="true" data-news-carousel-toggle-icon>❚❚</span><span data-news-carousel-toggle-label>${t("carousel.pause")}</span></button></div><p class="sr-only" data-news-carousel-status role="status" aria-live="off"></p></div>`;
}

// ---- NOTICES ----
// noticesById는 상세 모달(initNoticeModal)이 id로 원문을 조회하는 데 쓰인다. 과거처럼
// 본문을 HTML 속성(data-notice-body)에 넣지 않으므로 여러 줄 본문이 가능하고, 제목/작성자도
// textContent로만 다뤄 XSS 삽입 경로가 없다. id는 배열 인덱스가 아니라 JSON의 고정 id라
// 공지를 추가/삭제해도 기존 글의 id·댓글이 밀리지 않는다.
const noticesById = new Map();
function renderNotices(items) {
  const noticeList = document.querySelector("#notices [data-notice-list]");
  if (!noticeList) return;
  noticesById.clear();
  items.forEach((n) => noticesById.set(n.id, n));

  noticeList.innerHTML = "";
  if (!items.length) {
    noticeList.innerHTML = `<p class="notice-empty">${t("notices.empty")}</p>`;
    return;
  }
  const sorted = items.slice().sort((a, b) => b.date.localeCompare(a.date));
  sorted.forEach((n) => {
    const article = document.createElement("article");
    article.className = "notice-row";
    article.dataset.noticeId = n.id;

    const time = document.createElement("time");
    time.className = "notice-date";
    time.textContent = n.date;

    const h3 = document.createElement("h3");
    h3.className = "notice-title";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "notice-title-btn";
    btn.setAttribute("data-notice-open", "");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.textContent = pick(n, "title");
    h3.appendChild(btn);

    const author = document.createElement("span");
    author.className = "notice-author";
    author.textContent = n.author;

    article.append(time, h3, author);
    noticeList.appendChild(article);
  });
}

// ---- TRAINING ----
// content/training.json drives the day-schedule table (rows are fully regenerated, not
// index-patched, so adding/removing a training day needs no code change) and the DRYLAND
// note. GROUPS/STRUCTURE stay hardcoded here — they describe the enduring training
// philosophy/format rather than an operational detail that changes week to week.
function trainingRowHtml(row) {
  const session = pick(row, "session");
  const location = pick(row, "location");
  return `<div class="table-row" role="row"><span>${row.day || ""}</span><span>${row.time || ""}</span><span>${session}</span><span>${location}</span></div>`;
}
function renderTraining(schedule, dryland) {
  const training = document.querySelector("#training");
  if (!training) return;
  const introEl = training.querySelector(".section-intro");
  if (introEl) introEl.textContent = t("training.intro");
  const rowsContainer = training.querySelector("[data-training-rows]");
  if (rowsContainer) rowsContainer.innerHTML = schedule.map(trainingRowHtml).join("");
  const notes = training.querySelectorAll(".training-notes > div");
  if (notes[0]) notes[0].innerHTML = `<b>GROUPS</b><p><strong>${t("training.groups.advanced")}</strong><br><strong>${t("training.groups.intermediate")}</strong><br><small>ADVANCED LANE · INTERMEDIATE / DEVELOPMENT LANE</small></p>`;
  if (notes[1]) notes[1].innerHTML = `<b>STRUCTURE</b><p>${t("training.structure.body")}<br><small>DRILLS · INTERVALS · TECHNIQUE · ENDURANCE</small></p>`;
  const drylandHeadline = pick(dryland, "headline") || "TBD";
  const drylandCaption = pick(dryland, "caption") || t("training.dryland.captionFallback");
  if (notes[2]) notes[2].innerHTML = `<b>DRYLAND</b><p><strong>${drylandHeadline}</strong><br><small>${drylandCaption}</small></p>`;
}

// ---- WEEKLY TRAINING SESSIONS ----
// Sits between the day-schedule table and the GROUPS/STRUCTURE/DRYLAND notes.
// Sourced entirely from Supabase training_sessions; if two rows share the same day
// (e.g. coach forgot to remove last week's), the most recent date wins. If there are no
// sessions at all, the entire block stays hidden — no empty grid between the tables.
const WEEKLY_TRAINING_DAYS = ["화", "목"];
function latestWeeklyTrainingByDay(sessions) {
  const latestByDay = {};
  sessions.forEach((s) => {
    if (!latestByDay[s.day] || String(s.date) >= String(latestByDay[s.day].date)) latestByDay[s.day] = s;
  });
  return latestByDay;
}
// Cards show only a summary (day/date, total distance, theme if present) — the full
// WARM-UP/MAIN SET/EVENTS/COOL-DOWN text and any structured set breakdown live in the
// shared session modal (see initSessionModal below), opened on click.
function appendWeeklyTrainingCards(container, sessions) {
  const latestByDay = latestWeeklyTrainingByDay(sessions);
  WEEKLY_TRAINING_DAYS.forEach((day) => {
    const session = latestByDay[day];
    const dayLabel = t(`weekly.day.${day}`);
    const article = document.createElement("article");
    article.className = `weekly-session${session ? "" : " weekly-session--empty"}`;
    const dayEl = document.createElement("p");
    dayEl.className = "weekly-session-day";
    dayEl.textContent = dayLabel;
    article.append(dayEl);
    if (!session) {
      const emptyEl = document.createElement("p");
      emptyEl.className = "weekly-session-empty";
      emptyEl.textContent = t("weekly.pending");
      article.append(emptyEl);
      container.append(article);
      return;
    }
    const head = document.createElement("div");
    head.className = "weekly-session-head";
    head.append(dayEl);
    const date = document.createElement("time");
    date.className = "weekly-session-date";
    date.textContent = session.date || "";
    head.append(date);
    article.append(head);
    const distance = document.createElement("p");
    distance.className = "weekly-session-distance";
    distance.textContent = session.totalDistance ? `${Number(session.totalDistance).toLocaleString()}m` : "";
    article.append(distance);
    if (session.theme) {
      const theme = document.createElement("p");
      theme.className = "weekly-session-theme";
      theme.textContent = session.theme;
      article.append(theme);
    }
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "weekly-session-trigger";
    trigger.setAttribute("aria-label", t("weekly.viewTraining", { day: dayLabel }));
    trigger.append(article);
    trigger.addEventListener("click", () => openSessionModal(session, trigger));
    container.append(trigger);
  });
}
function renderWeeklyTraining(sessions) {
  const container = document.querySelector("[data-weekly-training]");
  if (!container) return;
  if (!sessions.length) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  const title = document.createElement("p");
  title.className = "weekly-training-title";
  title.textContent = "THIS WEEK'S SESSIONS";
  const grid = document.createElement("div");
  grid.className = "weekly-training-grid";
  appendWeeklyTrainingCards(grid, sessions);
  container.replaceChildren(title, grid);
  container.hidden = false;
}
function renderHomeWeeklyTraining(sessions) {
  const container = document.querySelector("[data-home-weekly-training]");
  if (!container) return;
  const shell = document.createElement("div");
  shell.className = "shell";
  const title = document.createElement("a");
  title.className = "weekly-training-title home-weekly-training-title";
  title.href = "#training";
  title.textContent = "THIS WEEK'S SESSIONS";
  const grid = document.createElement("div");
  grid.className = "weekly-training-grid";
  appendWeeklyTrainingCards(grid, sessions);
  shell.append(title, grid);
  container.replaceChildren(shell);
}

const STROKE_KEYS = ["freestyle", "backstroke", "butterfly", "breaststroke", "drill"];
function strokeLabel(value) {
  return STROKE_KEYS.includes(value) ? t(`training.stroke.${value}`) : value;
}

const SESSION_DETAIL_CATEGORIES = ["warmup", "mainset", "events", "cooldown"];
const SESSION_MODAL_CATEGORY_LABELS = { warmup: "WARM-UP", mainset: "MAIN SET", events: "EVENTS", cooldown: "COOL-DOWN" };

// Shared by both the home "THIS WEEK'S SESSIONS" cards and the TRAINING section cards
// (see appendWeeklyTrainingCards above). Each of WARM-UP/MAIN SET/EVENTS/COOL-DOWN is its
// own section: the short theme text comes straight from the session object already in
// hand, but the structured stroke/distance/content/sets/pace breakdown only exists for
// coach-managed sessions (which carry an `id`) and is fetched from Supabase once when the
// modal opens (single query, split by category client-side), matching the read-anyone RLS
// policy on training_session_details. A section only becomes expandable when it actually
// has rows — theme-only sections render as a static line, matching the pre-breakdown look.
function initSessionModal() {
  const modal = document.querySelector("[data-session-modal]");
  const panel = modal && modal.querySelector("[data-session-modal-panel]");
  if (!modal || !panel) return;

  const closeBtn = modal.querySelector("[data-session-modal-close]");
  const titleEl = modal.querySelector("[data-session-modal-title]");
  const metaEl = modal.querySelector("[data-session-modal-meta]");
  const sectionsEl = modal.querySelector("[data-session-modal-sections]");
  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  // See initHomeNewsCarousel's ac comment — same purpose here.
  const ac = new AbortController();
  let lastFocused = null;
  let openToken = 0;

  function getFocusable() {
    return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") { event.preventDefault(); closeModal(); return; }
    if (event.key !== "Tab") return;
    const focusable = getFocusable();
    if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }

  function buildDetailTable(rows) {
    const table = document.createElement("table");
    table.className = "session-modal-sets-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    [
      t("training.sessionModal.distanceColumn"),
      t("training.sessionModal.strokeColumn"),
      t("training.sessionModal.contentColumn"),
      t("training.sessionModal.setsColumn"),
      t("training.sessionModal.paceColumn")
    ].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.append(th);
    });
    thead.append(headRow);
    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const distanceTd = document.createElement("td");
      distanceTd.textContent = row.distance ? `${Number(row.distance).toLocaleString()}m` : "—";
      const strokeTd = document.createElement("td");
      strokeTd.textContent = strokeLabel(row.stroke);
      const contentTd = document.createElement("td");
      contentTd.textContent = row.content || "—";
      const setsTd = document.createElement("td");
      setsTd.textContent = row.sets ?? "—";
      const paceTd = document.createElement("td");
      paceTd.textContent = row.pace || "—";
      tr.append(distanceTd, strokeTd, contentTd, setsTd, paceTd);
      tbody.append(tr);
    });
    table.append(thead, tbody);
    return table;
  }

  function renderSections(session, detailsByCategory) {
    sectionsEl.replaceChildren();
    SESSION_DETAIL_CATEGORIES.forEach((category) => {
      const theme = pick(session.details || {}, category);
      const rows = detailsByCategory[category] || [];
      if (!theme && !rows.length) return;

      const section = document.createElement("div");
      section.className = "session-modal-section";

      if (rows.length) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "session-modal-section-toggle";
        button.setAttribute("aria-expanded", "false");

        const labelEl = document.createElement("span");
        labelEl.className = "session-modal-section-label";
        labelEl.textContent = SESSION_MODAL_CATEGORY_LABELS[category];
        const themeEl = document.createElement("span");
        themeEl.className = "session-modal-section-theme";
        themeEl.textContent = theme || "";
        const hint = document.createElement("span");
        hint.className = "session-modal-section-hint";
        hint.setAttribute("aria-hidden", "true");
        const hintText = document.createElement("span");
        hintText.className = "session-modal-section-hint-text";
        hintText.textContent = t("training.sessionModal.tapHint");
        const chevron = document.createElement("span");
        chevron.className = "session-modal-section-chevron";
        chevron.textContent = "▾";
        hint.append(hintText, chevron);
        button.append(labelEl, themeEl, hint);

        const detailPanel = document.createElement("div");
        detailPanel.className = "session-modal-section-panel";
        detailPanel.hidden = true;
        detailPanel.append(buildDetailTable(rows));

        button.addEventListener("click", () => {
          const expanded = button.getAttribute("aria-expanded") === "true";
          button.setAttribute("aria-expanded", String(!expanded));
          detailPanel.hidden = expanded;
        });

        section.append(button, detailPanel);
      } else {
        const staticRow = document.createElement("div");
        staticRow.className = "session-modal-section-static";
        const labelEl = document.createElement("span");
        labelEl.className = "session-modal-section-label";
        labelEl.textContent = SESSION_MODAL_CATEGORY_LABELS[category];
        const themeEl = document.createElement("span");
        themeEl.className = "session-modal-section-theme";
        themeEl.textContent = theme;
        staticRow.append(labelEl, themeEl);
        section.append(staticRow);
      }

      sectionsEl.append(section);
    });
  }

  async function loadSections(session, token) {
    if (!session.id) {
      renderSections(session, {});
      return;
    }
    sectionsEl.replaceChildren();
    const status = document.createElement("p");
    status.className = "session-modal-sections-status";
    status.textContent = t("training.sessionModal.setsLoading");
    sectionsEl.append(status);
    const { data, error } = await supabase
      .from("training_session_details")
      .select("category, stroke, distance, content, sets, pace")
      .eq("session_id", session.id)
      .order("sort_order", { ascending: true });
    if (token !== openToken) return; // modal closed or reopened for a different session meanwhile
    const detailsByCategory = error || !data ? {} : data.reduce((map, row) => {
      (map[row.category] || (map[row.category] = [])).push(row);
      return map;
    }, {});
    renderSections(session, detailsByCategory);
  }

  function openModal(session, trigger) {
    lastFocused = trigger || document.activeElement;
    openToken += 1;
    const token = openToken;

    const dayLabel = t(`weekly.day.${session.day}`) || session.day || "";
    titleEl.textContent = `${dayLabel} · ${session.date || ""}`;
    const metaParts = [];
    if (session.totalDistance) metaParts.push(`${Number(session.totalDistance).toLocaleString()}m`);
    if (session.theme) metaParts.push(session.theme);
    metaEl.textContent = metaParts.join(" · ");
    metaEl.hidden = !metaParts.length;

    loadSections(session, token);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("session-modal-open");
    document.addEventListener("keydown", handleKeydown, { signal: ac.signal });
    panel.focus();
  }

  function closeModal() {
    if (!modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("session-modal-open");
    document.removeEventListener("keydown", handleKeydown);
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    lastFocused = null;
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal, { signal: ac.signal });
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); }, { signal: ac.signal });

  openSessionModal = openModal;
  teardowns.push(() => { closeModal(); ac.abort(); openSessionModal = () => {}; });
}

const infoItems = document.querySelectorAll(".info-grid article");
if (infoItems[1]) infoItems[1].innerHTML = '<p class="eyebrow">LATEST RESULT</p><strong>2026년 전국생활체육대축전 서울시 대표 선발전 수영대회</strong><span>FREESTYLE · 1ST / BUTTERFLY · 2ND</span><a href="#records">VIEW RESULTS <b>↗</b></a>';
const featuredAchievement = document.querySelector(".highlight-record");
if (featuredAchievement) featuredAchievement.innerHTML = '<p class="eyebrow accent">FEATURED ACHIEVEMENT</p><p class="record-event">제31회 전국대학수영선수권대회</p><strong>JOINT 1ST</strong><div><span>DIVISIONS</span><b>MEN\'S DIV II · WOMEN\'S DIV II</b></div><div><span>DATE</span><b>2025. 11. 8. – 11. 9.</b></div><a href="#records">VIEW RESULTS <b>↗</b></a>';

// ---- TEAM ----
// Three independent collections feed the three tabs: content/leadership.json (LEADERSHIP),
// content/team.json's `members` array (MEMBERS), content/legacy.json (LEGACY). Each is
// rendered as cards when it has entries; when a collection is empty (admin hasn't
// registered anyone yet), that tab alone falls back to the shared notice text from
// content/team.json's `membersNote` — the other tabs are unaffected either way.
// t()/pick() called lazily inside these functions (not as a module-level const) so the
// text always reflects the language active at render time, not at module load time.
// activeTeamTab / memberStatusFilter are module-level so a re-render (language switch,
// content reload) preserves whatever tab the user is currently looking at instead of
// snapping back to the defaults.
let activeTeamTab = "leadership";
let memberStatusFilter = "active"; // "active" | "OB" — MEMBERS sub-filter, defaults to 재적부원
function emptyTeamStateHtml(label, note) {
  return `<div class="member-directory"><p>${label}</p><p>${note || t("team.membersNoteFallback")}</p></div>`;
}
function leaderCardHtml(leader) {
  const { role, photo } = leader;
  const name = pick(leader, "name");
  const koRole = pick(leader, "koRole");
  const photoAlt = t("team.profilePhotoAlt", { name });
  const photoHtml = photo
    ? `<div class="member-photo has-photo"><img src="${assetPath(photo)}" alt="${photoAlt}" loading="lazy"></div>`
    : '<div class="member-photo no-photo"><img src="./assets/images/university-logo.png" alt="Seoul National University logo"></div>';
  return `<article class="leader">${photoHtml}<p class="leader-role">${role}</p><h3>${name}</h3><p class="ko-role">${koRole}</p></article>`;
}
function memberCardHtml(member) {
  const { photo } = member;
  const name = pick(member, "name");
  const department = pick(member, "department");
  const year = pick(member, "year");
  const bio = pick(member, "bio");
  const sns = pick(member, "sns");
  const status = member.status === "OB" ? "OB" : "active";
  const statusLabel = status === "OB" ? t("team.statusOB") : t("team.statusActive");
  const photoAlt = t("team.profilePhotoAlt", { name });
  const photoHtml = photo
    ? `<div class="member-photo has-photo"><img src="${assetPath(photo)}" alt="${photoAlt}" loading="lazy"></div>`
    : '<div class="member-photo no-photo"><img src="./assets/images/university-logo.png" alt="Seoul National University logo"></div>';
  const meta = [department, year].filter(Boolean).join(" · ");
  const extras = bio || sns ? `<div class="member-extra">${bio ? `<div class="member-bio"><span>${t("team.bio")}</span><p>${bio}</p></div>` : ""}${sns ? `<div class="member-sns"><span>${t("team.sns")}</span><p>${sns}</p></div>` : ""}</div>` : "";
  return `<article class="leader" data-member-status="${status}">${photoHtml}<p class="leader-role">${statusLabel}</p><h3>${name}</h3><p class="ko-role">${meta}</p>${extras}</article>`;
}
// memberStatusTabsHtml()/memberCardsHtml() are split out from renderTeam() so the MEMBERS
// sub-filter click handler can re-render just the card grid (via [data-member-cards])
// instead of rebuilding the whole #team shell — that would also reset the outer
// LEADERSHIP/MEMBERS/LEGACY tab back to its default.
function memberStatusTabsHtml() {
  return `<div class="filter-bar member-status-tabs" role="tablist"><button class="${memberStatusFilter === "active" ? "is-active" : ""}" data-member-status-tab="active">${t("team.statusActive")}</button><button class="${memberStatusFilter === "OB" ? "is-active" : ""}" data-member-status-tab="OB">${t("team.statusOB")}</button></div>`;
}
function memberCardsHtml(members, membersNote) {
  const filtered = (members || []).filter((member) => (memberStatusFilter === "OB" ? member.status === "OB" : member.status !== "OB"));
  const inner = filtered.length
    ? `<div class="leadership-directory">${filtered.map(memberCardHtml).join("")}</div>`
    : emptyTeamStateHtml("MEMBER DIRECTORY", membersNote);
  return `<div data-member-cards>${inner}</div>`;
}
function legacyEntryHtml(entry) {
  const { name, tag, photo } = entry;
  const body = pick(entry, "body");
  const photoHtml = photo
    ? `<div class="member-photo has-photo"><img src="${assetPath(photo)}" alt="${t("team.profilePhotoAlt", { name })}" loading="lazy" data-legacy-photo></div>`
    : '<div class="member-photo no-photo"><img src="./assets/images/university-logo.png" alt="Seoul National University logo"></div>';
  return `<article class="legacy-note"><div>${photoHtml}<p class="eyebrow">TEAM LEGACY</p><strong>${name}</strong></div><div><p>${body}</p>${tag ? `<p class="legacy-pending">${tag}</p>` : ""}</div></article>`;
}
function renderTeam(team, leaders, members, legacyEntries) {
  const teamShell = document.querySelector("#team .shell");
  if (!teamShell) return;
  const membersNote = pick(team, "membersNote");

  const leadershipHtml = (leaders && leaders.length)
    ? `<div class="leadership-directory">${leaders.map(leaderCardHtml).join("")}</div>`
    : emptyTeamStateHtml("LEADERSHIP", membersNote);

  const membersHtml = (members && members.length)
    ? `${memberStatusTabsHtml()}${memberCardsHtml(members, membersNote)}`
    : emptyTeamStateHtml("MEMBER DIRECTORY", membersNote);

  const legacyHtml = (legacyEntries && legacyEntries.length)
    ? legacyEntries.map(legacyEntryHtml).join("")
    : emptyTeamStateHtml("TEAM LEGACY", membersNote);

  teamShell.innerHTML = `<div class="section-head"><div><p class="section-number">02</p><p class="eyebrow accent">TEAM</p></div><h2>MEET<br>THE TEAM.</h2></div><div class="filter-bar team-tabs" role="tablist"><button class="${activeTeamTab === "leadership" ? "is-active" : ""}" data-team-tab="leadership">LEADERSHIP</button><button class="${activeTeamTab === "members" ? "is-active" : ""}" data-team-tab="members">MEMBERS</button><button class="${activeTeamTab === "legacy" ? "is-active" : ""}" data-team-tab="legacy">LEGACY</button></div><div class="team-directory-view" data-team-view="leadership" ${activeTeamTab !== "leadership" ? "hidden" : ""}>${leadershipHtml}</div><div class="team-directory-view" data-team-view="members" ${activeTeamTab !== "members" ? "hidden" : ""}>${membersHtml}</div><div class="team-directory-view" data-team-view="legacy" ${activeTeamTab !== "legacy" ? "hidden" : ""}>${legacyHtml}</div>`;
  teamShell.querySelectorAll("[data-legacy-photo]").forEach((image) => image.addEventListener("error", () => {
    image.src = "./assets/images/university-logo.png";
    image.alt = "Seoul National University logo";
    image.parentElement.className = "member-photo no-photo";
  }, { once: true }));
  teamShell.querySelectorAll("[data-team-tab]").forEach((button) => button.addEventListener("click", () => {
    activeTeamTab = button.dataset.teamTab;
    teamShell.querySelectorAll("[data-team-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
    teamShell.querySelectorAll("[data-team-view]").forEach((view) => { view.hidden = view.dataset.teamView !== activeTeamTab; });
  }));
  const membersView = teamShell.querySelector('[data-team-view="members"]');
  if (membersView) {
    membersView.querySelectorAll("[data-member-status-tab]").forEach((button) => button.addEventListener("click", () => {
      if (button.classList.contains("is-active")) return;
      memberStatusFilter = button.dataset.memberStatusTab;
      membersView.querySelectorAll("[data-member-status-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      const cardsContainer = membersView.querySelector("[data-member-cards]");
      if (cardsContainer) cardsContainer.outerHTML = memberCardsHtml(members, membersNote);
    }));
  }
}

// ---- HOME "TEAM UPDATES" CAROUSEL ----
// Slide count is read from the DOM (data-carousel-track children) at call time, so this
// must run after renderHomeNewsCarousel() has populated the track.
function initHomeNewsCarousel() {
  const root = document.querySelector("[data-carousel]");
  const track = root && root.querySelector("[data-carousel-track]");
  if (!root || !track) return;

  const slides = Array.from(track.children);
  const dotsWrap = root.parentElement.querySelector("[data-carousel-dots]");
  const toggleBtn = root.parentElement.querySelector("[data-carousel-toggle]");
  const toggleLabel = toggleBtn && toggleBtn.querySelector("[data-carousel-toggle-label]");
  const toggleIcon = toggleBtn && toggleBtn.querySelector("[data-carousel-toggle-icon]");
  const statusEl = root.parentElement.querySelector("[data-carousel-status]");
  const prevBtn = root.querySelector("[data-carousel-prev]");
  const nextBtn = root.querySelector("[data-carousel-next]");
  const AUTOPLAY_MS = 6000;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (slides.length <= 1) {
    if (dotsWrap) dotsWrap.hidden = true;
    if (toggleBtn) toggleBtn.hidden = true;
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    return;
  }

  // Aborts every listener registered below (via { signal: ac.signal }) in one call — used
  // by the teardown registered at the bottom so a language switch's re-render doesn't
  // stack a second set of listeners/timers on top of this one.
  const ac = new AbortController();
  let index = 0;
  let timer = null;
  let isPlaying = true;

  slides.forEach((slide, i) => {
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${i + 1} / ${slides.length}`);
  });

  dotsWrap.innerHTML = slides
    .map((_, i) => `<button type="button" role="tab" aria-selected="false" aria-label="${t("carousel.goToCard", { n: i + 1 })}" data-carousel-dot="${i}"></button>`)
    .join("");
  const dots = Array.from(dotsWrap.querySelectorAll("[data-carousel-dot]"));

  function setSlideFocusability(activeIndex) {
    slides.forEach((slide, s) => {
      const active = s === activeIndex;
      slide.setAttribute("aria-hidden", String(!active));
      slide.querySelectorAll("a, button").forEach((el) => {
        if (active) el.removeAttribute("tabindex");
        else el.setAttribute("tabindex", "-1");
      });
    });
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    setSlideFocusability(index);
    dots.forEach((dot, d) => {
      dot.classList.toggle("is-active", d === index);
      dot.setAttribute("aria-selected", String(d === index));
    });
    if (statusEl) {
      const heading = slides[index].querySelector("h3");
      statusEl.textContent = `${index + 1} / ${slides.length}${heading ? `: ${heading.textContent}` : ""}`;
    }
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function stopAutoplay() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function startAutoplay() {
    stopAutoplay();
    if (prefersReducedMotion) return;
    timer = setInterval(next, AUTOPLAY_MS);
  }
  function setPlaying(playing) {
    isPlaying = playing;
    if (statusEl) statusEl.setAttribute("aria-live", playing ? "off" : "polite");
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", String(!playing));
      toggleBtn.setAttribute("aria-label", playing ? t("carousel.pauseAutoplay") : t("carousel.startAutoplay"));
      if (toggleLabel) toggleLabel.textContent = playing ? t("carousel.pause") : t("carousel.play");
      if (toggleIcon) toggleIcon.textContent = playing ? "❚❚" : "▶";
    }
    if (playing) startAutoplay(); else stopAutoplay();
  }

  dots.forEach((dot) => dot.addEventListener("click", () => { goTo(Number(dot.dataset.carouselDot)); if (isPlaying) startAutoplay(); }, { signal: ac.signal }));
  if (prevBtn) prevBtn.addEventListener("click", () => { prev(); if (isPlaying) startAutoplay(); }, { signal: ac.signal });
  if (nextBtn) nextBtn.addEventListener("click", () => { next(); if (isPlaying) startAutoplay(); }, { signal: ac.signal });
  if (toggleBtn) toggleBtn.addEventListener("click", () => setPlaying(!isPlaying), { signal: ac.signal });

  // Pause on hover, resume on mouse leave.
  root.addEventListener("mouseenter", stopAutoplay, { signal: ac.signal });
  root.addEventListener("mouseleave", () => { if (isPlaying) startAutoplay(); }, { signal: ac.signal });
  // Pause while any control/link inside has keyboard focus; resume once focus leaves.
  root.addEventListener("focusin", stopAutoplay, { signal: ac.signal });
  root.addEventListener("focusout", (event) => {
    if (isPlaying && !root.contains(event.relatedTarget)) startAutoplay();
  }, { signal: ac.signal });

  // Touch swipe (mobile): left swipe -> next, right swipe -> previous.
  let touchStartX = 0;
  let touchStartY = 0;
  let touchTracking = false;
  track.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    touchStartX = touch.clientX; touchStartY = touch.clientY; touchTracking = true;
    stopAutoplay();
  }, { passive: true, signal: ac.signal });
  track.addEventListener("touchend", (event) => {
    if (!touchTracking) return;
    touchTracking = false;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const SWIPE_THRESHOLD = 40;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) next(); else prev();
    }
    if (isPlaying) startAutoplay();
  }, { passive: true, signal: ac.signal });

  goTo(0);
  setPlaying(true);

  teardowns.push(() => { ac.abort(); stopAutoplay(); });
}

// ---- NEWS MODAL ----
// Card data (title/date·category/image/summary) is read straight from each
// article's DOM at click time, so cards can be added or removed in the NEWS
// section markup without touching this script. Full article body comes from
// the `data-news-body` attribute renderNewsSection() sets from content/news.json.
function initNewsModal() {
  const modal = document.querySelector("[data-news-modal]");
  const panel = modal && modal.querySelector("[data-news-modal-panel]");
  if (!modal || !panel) return;

  const closeBtn = modal.querySelector("[data-news-modal-close]");
  const imageEl = modal.querySelector("[data-news-modal-image]");
  const metaEl = modal.querySelector("[data-news-modal-meta]");
  const titleEl = modal.querySelector("[data-news-modal-title]");
  const leadEl = modal.querySelector("[data-news-modal-lead]");
  const bodyEl = modal.querySelector("[data-news-modal-body]");
  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const BODY_FALLBACK = t("news.bodyFallback");
  // See initHomeNewsCarousel's ac comment — same purpose here.
  const ac = new AbortController();
  let lastFocused = null;

  function readCardData(article) {
    const meta = article.querySelector(".news-meta");
    const heading = article.querySelector("h3");
    const image = article.querySelector("img");
    const leadParagraph = Array.from(article.querySelectorAll("p")).find((p) => !p.classList.contains("news-meta"));
    return {
      meta: meta ? meta.textContent.trim() : "",
      title: heading ? heading.textContent.trim() : "",
      imageSrc: image ? image.src : "",
      imageAlt: image ? image.alt : "",
      lead: leadParagraph ? leadParagraph.textContent.trim() : "",
      body: article.dataset.newsBody || ""
    };
  }

  function getFocusable() {
    return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") { event.preventDefault(); closeModal(); return; }
    if (event.key !== "Tab") return;
    const focusable = getFocusable();
    if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }

  function openModal(article, trigger) {
    const data = readCardData(article);
    lastFocused = trigger || document.activeElement;

    metaEl.textContent = data.meta;
    titleEl.textContent = data.title;

    if (data.imageSrc) {
      imageEl.src = data.imageSrc;
      imageEl.alt = data.imageAlt;
      imageEl.hidden = false;
    } else {
      imageEl.hidden = true;
      imageEl.removeAttribute("src");
    }

    if (data.lead) {
      leadEl.textContent = data.lead;
      leadEl.hidden = false;
    } else {
      leadEl.hidden = true;
      leadEl.textContent = "";
    }

    bodyEl.textContent = data.body || BODY_FALLBACK;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("news-modal-open");
    document.addEventListener("keydown", handleKeydown, { signal: ac.signal });
    panel.focus();
  }

  function closeModal() {
    if (!modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("news-modal-open");
    document.removeEventListener("keydown", handleKeydown);
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    lastFocused = null;
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-news-read-more]");
    if (!trigger) return;
    const article = trigger.closest("article");
    if (!article) return;
    event.preventDefault();
    openModal(article, trigger);
  }, { signal: ac.signal });

  if (closeBtn) closeBtn.addEventListener("click", closeModal, { signal: ac.signal });
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); }, { signal: ac.signal });

  teardowns.push(() => { closeModal(); ac.abort(); });
}

// ---- NEWS CAROUSEL ----
// A fully separate carousel instance for the NEWS section slides rendered above.
// This is deliberately NOT shared with initHomeNewsCarousel (TEAM UPDATES) — different
// data-news-carousel* attributes, different variables/closures, nothing in common — so
// nothing here can ever affect that carousel's logic or state, and vice versa.
function initNewsCarousel() {
  const root = document.querySelector("[data-news-carousel]");
  const track = root && root.querySelector("[data-news-carousel-track]");
  if (!root || !track) return;

  const slides = Array.from(track.children);
  const dotsWrap = root.parentElement.querySelector("[data-news-carousel-dots]");
  const toggleBtn = root.parentElement.querySelector("[data-news-carousel-toggle]");
  const toggleLabel = toggleBtn && toggleBtn.querySelector("[data-news-carousel-toggle-label]");
  const toggleIcon = toggleBtn && toggleBtn.querySelector("[data-news-carousel-toggle-icon]");
  const statusEl = root.parentElement.querySelector("[data-news-carousel-status]");
  const prevBtn = root.querySelector("[data-news-carousel-prev]");
  const nextBtn = root.querySelector("[data-news-carousel-next]");
  const AUTOPLAY_MS = 6000;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (slides.length <= 1) {
    if (dotsWrap) dotsWrap.hidden = true;
    if (toggleBtn) toggleBtn.hidden = true;
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    return;
  }

  // Aborts every listener registered below (via { signal: ac.signal }) in one call — used
  // by the teardown registered at the bottom so a language switch's re-render doesn't
  // stack a second set of listeners/timers on top of this one.
  const ac = new AbortController();
  let index = 0;
  let timer = null;
  let isPlaying = true;

  slides.forEach((slide, i) => {
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${i + 1} / ${slides.length}`);
  });

  dotsWrap.innerHTML = slides
    .map((_, i) => `<button type="button" role="tab" aria-selected="false" aria-label="${t("carousel.goToCard", { n: i + 1 })}" data-news-carousel-dot="${i}"></button>`)
    .join("");
  const dots = Array.from(dotsWrap.querySelectorAll("[data-news-carousel-dot]"));

  function setSlideFocusability(activeIndex) {
    slides.forEach((slide, s) => {
      const active = s === activeIndex;
      slide.setAttribute("aria-hidden", String(!active));
      slide.querySelectorAll("a, button").forEach((el) => {
        if (active) el.removeAttribute("tabindex");
        else el.setAttribute("tabindex", "-1");
      });
    });
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    setSlideFocusability(index);
    dots.forEach((dot, d) => {
      dot.classList.toggle("is-active", d === index);
      dot.setAttribute("aria-selected", String(d === index));
    });
    if (statusEl) {
      const heading = slides[index].querySelector("h3");
      statusEl.textContent = `${index + 1} / ${slides.length}${heading ? `: ${heading.textContent}` : ""}`;
    }
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function stopAutoplay() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function startAutoplay() {
    stopAutoplay();
    if (prefersReducedMotion) return;
    timer = setInterval(next, AUTOPLAY_MS);
  }
  function setPlaying(playing) {
    isPlaying = playing;
    if (statusEl) statusEl.setAttribute("aria-live", playing ? "off" : "polite");
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", String(!playing));
      toggleBtn.setAttribute("aria-label", playing ? t("carousel.pauseAutoplay") : t("carousel.startAutoplay"));
      if (toggleLabel) toggleLabel.textContent = playing ? t("carousel.pause") : t("carousel.play");
      if (toggleIcon) toggleIcon.textContent = playing ? "❚❚" : "▶";
    }
    if (playing) startAutoplay(); else stopAutoplay();
  }

  dots.forEach((dot) => dot.addEventListener("click", () => { goTo(Number(dot.dataset.newsCarouselDot)); if (isPlaying) startAutoplay(); }, { signal: ac.signal }));
  if (prevBtn) prevBtn.addEventListener("click", () => { prev(); if (isPlaying) startAutoplay(); }, { signal: ac.signal });
  if (nextBtn) nextBtn.addEventListener("click", () => { next(); if (isPlaying) startAutoplay(); }, { signal: ac.signal });
  if (toggleBtn) toggleBtn.addEventListener("click", () => setPlaying(!isPlaying), { signal: ac.signal });

  // Pause on hover, resume on mouse leave.
  root.addEventListener("mouseenter", stopAutoplay, { signal: ac.signal });
  root.addEventListener("mouseleave", () => { if (isPlaying) startAutoplay(); }, { signal: ac.signal });
  // Pause while any control/link inside has keyboard focus; resume once focus leaves.
  root.addEventListener("focusin", stopAutoplay, { signal: ac.signal });
  root.addEventListener("focusout", (event) => {
    if (isPlaying && !root.contains(event.relatedTarget)) startAutoplay();
  }, { signal: ac.signal });

  // Touch swipe (mobile): left swipe -> next, right swipe -> previous.
  let touchStartX = 0;
  let touchStartY = 0;
  let touchTracking = false;
  track.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    touchStartX = touch.clientX; touchStartY = touch.clientY; touchTracking = true;
    stopAutoplay();
  }, { passive: true, signal: ac.signal });
  track.addEventListener("touchend", (event) => {
    if (!touchTracking) return;
    touchTracking = false;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const SWIPE_THRESHOLD = 40;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) next(); else prev();
    }
    if (isPlaying) startAutoplay();
  }, { passive: true, signal: ac.signal });

  goTo(0);
  setPlaying(true);

  teardowns.push(() => { ac.abort(); stopAutoplay(); });
}

// ---- NOTICE MODAL (공지사항 상세) ----
// Separate, self-contained modal instance for the NOTICES section — independent from
// initNewsModal (NEWS 섹션 모달). Title/body come from noticesById (keyed by the stable
// JSON id, not the row's position), so adding/removing entries in content/notices.json
// needs no other changes.
function initNoticeModal() {
  const modal = document.querySelector("[data-notice-modal]");
  const panel = modal && modal.querySelector("[data-notice-modal-panel]");
  if (!modal || !panel) return;

  const closeBtn = modal.querySelector("[data-notice-modal-close]");
  const titleEl = modal.querySelector("[data-notice-modal-title]");
  const bodyEl = modal.querySelector("[data-notice-modal-body]");
  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  // See initHomeNewsCarousel's ac comment — same purpose here.
  const ac = new AbortController();
  let lastFocused = null;

  function getFocusable() {
    return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") { event.preventDefault(); closeModal(); return; }
    if (event.key !== "Tab") return;
    const focusable = getFocusable();
    if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }

  function openModal(row, trigger) {
    lastFocused = trigger || document.activeElement;

    const notice = noticesById.get(row.dataset.noticeId);
    titleEl.textContent = notice ? pick(notice, "title") : "";
    bodyEl.textContent = notice ? pick(notice, "body") : "";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("notice-modal-open");
    document.addEventListener("keydown", handleKeydown, { signal: ac.signal });
    panel.focus();
  }

  function closeModal() {
    if (!modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("notice-modal-open");
    document.removeEventListener("keydown", handleKeydown);
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    lastFocused = null;
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-notice-open]");
    if (!trigger) return;
    const row = trigger.closest(".notice-row");
    if (!row) return;
    openModal(row, trigger);
  }, { signal: ac.signal });

  if (closeBtn) closeBtn.addEventListener("click", closeModal, { signal: ac.signal });
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); }, { signal: ac.signal });

  teardowns.push(() => { closeModal(); ac.abort(); });
}

// ---- SCROLL REVEAL ----
// Registered after content render so it can observe elements that only exist once the
// fetched JSON has been rendered (e.g. .home-news-grid article cards). Most of the
// elements observed here (.reveal section wrappers, homepage groups below) are static
// markup that persists across re-renders, so without disconnecting the previous call's
// observers, a language switch would stack a fresh pair of IntersectionObservers on the
// same nodes every time — harmless in effect (all the callbacks are idempotent) but an
// unbounded leak, hence the teardown at the bottom.
function setupRevealObservers() {
  const revealItems = document.querySelectorAll(".reveal");
  let observer = null;
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: 0.08 });
    revealItems.forEach((item) => observer.observe(item));
  } else revealItems.forEach((item) => item.classList.add("is-visible"));

  // Homepage-only reveal rhythm. Detail pages and navigation remain untouched.
  const homeRevealGroups = [
    [".current-panel article", true],
    [".home-news .home-section-top, .home-news h2", false],
    [".home-news-grid article", true],
    [".quick-facts .eyebrow", false],
    [".quick-facts strong", false],
    [".home-join .shell > *", false],
    [".home-contact .contact-layout > *", false]
  ];
  const homeRevealItems = [];
  homeRevealGroups.forEach(([selector, cards]) => document.querySelectorAll(selector).forEach((item, index) => {
    item.classList.add("home-reveal");
    if (cards) item.classList.add("home-reveal-card");
    item.style.setProperty("--reveal-delay", `${index * 90}ms`);
    homeRevealItems.push(item);
  }));
  let homeRevealObserver = null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    homeRevealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    homeRevealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting || document.body.classList.contains("detail-mode")) return;
      entry.target.classList.add("is-visible");
      homeRevealObserver.unobserve(entry.target);
    }), { threshold: 0.12 });
    homeRevealItems.forEach((item) => homeRevealObserver.observe(item));
  }

  teardowns.push(() => { if (observer) observer.disconnect(); if (homeRevealObserver) homeRevealObserver.disconnect(); });
}

// ---- CONTENT LOADING ----
// GitHub Pages caches static files for a few minutes, so { cache: "no-cache" } forces an
// ETag revalidation request on every load — the admin's edits show up on next reload
// instead of being stuck behind a stale cached copy. Each fetch fails independently: one
// bad/missing JSON file falls back to an empty section instead of breaking the page.
async function fetchJson(path, fallback) {
  try {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn(`콘텐츠를 불러오지 못했습니다: ${path}`, err);
    return fallback;
  }
}

async function fetchTrainingSessions() {
  const { data, error } = await supabase
    .from("training_sessions")
    .select("id, date, day, total_distance, theme, warmup, mainset, events, cooldown")
    .order("date", { ascending: true });
  if (error) {
    console.warn("훈련 세션을 불러오지 못했습니다:", error.message);
    return [];
  }
  return (data || []).map((session) => ({
    id: session.id,
    date: session.date,
    day: session.day,
    totalDistance: session.total_distance,
    theme: session.theme || "",
    details: {
      warmup: session.warmup || "",
      mainset: session.mainset || "",
      events: session.events || "",
      cooldown: session.cooldown || ""
    }
  }));
}

function localDateKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function renderActivePopups(popups, teamMembers) {
  const visible = popups.filter((popup) => !localStorage.getItem(`popup_dismissed_${popup.id}_${localDateKey()}`));
  if (!visible.length) return;
  let index = 0;
  const host = document.createElement("div");
  host.className = "site-popup";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  const showNext = () => {
    const popup = visible[index++];
    if (!popup) { host.remove(); return; }
    const panel = document.createElement("section"); panel.className = "site-popup-panel";
    const close = document.createElement("button"); close.className = "site-popup-close"; close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", t("common.close"));
    const title = document.createElement("h2"); const body = document.createElement("p");
    let imageUrl = popup.image_url;
    if (popup.type === "attendance_winner") {
      title.textContent = popup.member_name || "—";
      const member = teamMembers.find((item) => item.name === popup.member_name);
      imageUrl = member?.photo ? assetPath(member.photo) : "./assets/images/university-logo.png";
    } else title.textContent = popup.title;
    body.textContent = popup.body;
    panel.append(close);
    if (imageUrl) { const image = document.createElement("img"); image.src = imageUrl; image.alt = title.textContent; panel.append(image); }
    panel.append(title, body);
    const actions = document.createElement("div"); actions.className = "site-popup-actions";
    const dismiss = document.createElement("button"); dismiss.type = "button"; dismiss.textContent = "오늘 하루 안 보기";
    const next = () => { panel.remove(); showNext(); };
    close.addEventListener("click", next); dismiss.addEventListener("click", () => { localStorage.setItem(`popup_dismissed_${popup.id}_${localDateKey()}`, "1"); next(); });
    actions.append(dismiss); panel.append(actions); host.replaceChildren(panel);
  };
  document.body.append(host); showNext();
}

async function loadActivePopups(teamMembers) {
  const { data, error } = await supabase.rpc("active_popups");
  if (!error) renderActivePopups(data || [], teamMembers || []);
}

// contentCache holds the last successful fetch so a language switch can re-render from
// it directly — every content/*.json file already carries both languages (sibling
// `<field>En` keys), so switching never needs a second round-trip to the server.
let contentCache = null;
let contentLoadPromise = null;

async function loadContent() {
  const [schedule, records, relays, gallery, news, notices, trainingSessions, team, training, leadership, legacy] = await Promise.all([
    fetchJson("./content/schedule.json", { events: [] }),
    fetchJson("./content/records.json", { entries: [] }),
    fetchJson("./content/relays.json", { entries: [] }),
    fetchJson("./content/gallery.json", { photos: [] }),
    fetchJson("./content/news.json", { items: [] }),
    fetchJson("./content/notices.json", { items: [] }),
    fetchTrainingSessions(),
    fetchJson("./content/team.json", { membersNote: "", members: [] }),
    fetchJson("./content/training.json", { schedule: [], dryland: {} }),
    fetchJson("./content/leadership.json", { members: [] }),
    fetchJson("./content/legacy.json", { entries: [] })
  ]);
  contentCache = { schedule, records, relays, gallery, news, notices, trainingSessions, team, training, leadership, legacy };
  loadActivePopups(team.members || []);
}

function renderAll() {
  if (!contentCache) return;
  const { schedule, records, relays, gallery, news, notices, trainingSessions, team, training, leadership, legacy } = contentCache;

  runTeardowns();

  renderSchedule(schedule.events || []);
  renderRecords(records.entries || [], relays.entries || []);
  renderGallery(gallery.photos || []);
  renderHomeNewsCarousel(news.items || []);
  renderNewsSection(news.items || []);
  renderNotices(notices.items || []);
  renderWeeklyTraining(trainingSessions || []);
  renderHomeWeeklyTraining(trainingSessions || []);
  renderTeam(team, leadership.members || [], team.members || [], legacy.entries || []);
  renderTraining(training.schedule || [], training.dryland || {});

  initHomeNewsCarousel();
  initNewsCarousel();
  initNewsModal();
  initNoticeModal();
  initSessionModal();

  setupRevealObservers();
}

initLang();
applyStaticTranslations();
contentLoadPromise = loadContent().then(renderAll);

// Re-render CMS-driven sections (and static [data-i18n] text) in place when the KR/EN
// toggle fires. No re-fetch, no page reload, current section (#hash) untouched.
window.addEventListener("langchange", () => {
  // i18n.js updates static [data-i18n*] copy synchronously. When a visitor
  // switches languages before the initial JSON requests finish, defer the
  // CMS-driven render until that same request completes rather than silently
  // returning from renderAll() with an empty cache.
  if (contentCache) {
    renderAll();
  } else if (contentLoadPromise) {
    contentLoadPromise.then(renderAll);
  }
});
