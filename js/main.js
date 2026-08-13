const header = document.querySelector("[data-header]");
const toggle = document.querySelector(".menu-toggle");
const menu = document.querySelector("#primary-menu");
const sectionIds = ["about", "team", "training", "schedule", "records", "news", "gallery", "join"];
const contentSections = sectionIds.map((id) => document.getElementById(id));

contentSections.forEach((section) => section.classList.add("content-section"));
const setMenu = (open) => { menu.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open)); document.body.classList.toggle("menu-open", open); };
toggle.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));

function showPage(id) {
  const isDetail = sectionIds.includes(id);
  document.body.classList.toggle("detail-mode", isDetail);
  contentSections.forEach((section) => section.classList.toggle("is-current", section.id === id));
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
if (brandName && brandName.firstChild) brandName.firstChild.textContent = "\uC11C\uC6B8\uB300\uD559\uAD50 \uC218\uC601\uBD80";


const scheduleEvents = [
  ["2025. 5. 11.", "JOINT TRAINING", "서울대 × 한국외대 수영부 연합훈련", "—"],
  ["2025. 5. 15. – 5. 17.", "COMPETITION", "2025 경기도 도민체전", "우승 (4관왕)"],
  ["2025. 5. 30. – 6. 1.", "COMPETITION", "제2회 쉬엄쉬엄 한강 3종 축제", "—"],
  ["2025. 6. 21. – 6. 22.", "COMPETITION", "2025 한강크로스위밍챌린지", "—"],
  ["2025. 9. 27. – 9. 28.", "COMPETITION", "2025 배럴 스프린트 챔피언십", "—"],
  ["2025. 10. 19.", "COMPETITION", "제1회 노원구청장배 및 제8회 연맹회장배 수영대회", "—"],
  ["2025. 11. 8. – 11. 9.", "COMPETITION", "제31회 전국대학수영선수권대회", "공동 1위 (남자 2부 · 여자 2부)"],
  ["2025. 11. 14.", "JOINT TRAINING", "스누풀(중앙 수영동아리) 연합훈련", "—"],
  ["2025. 11. 20. – 11. 24.", "COMPETITION", "전문체육인 전국대회(MBC배)", "3위"],
  ["2026. 3. 8.", "COMPETITION", "전국생활체육대축전 서울시 대표 선발전 수영대회", "자유형 1위 · 접영 2위"],
  ["2026. 5. 2. – 5. 3.", "EXCHANGE EVENT", "서울대 × 카이스트 연합교류전", "카이스트 17명 · 서울대 8명"],
  ["2026. 5. 18. – 5. 21.", "EXCHANGE EVENT", "서울대 × PolyU", "PolyU 8명 · 서울대 6명"],
  ["2026. 6. 5. – 6. 7.", "COMPETITION", "제3회 수영연합 한강 3종 축제", "완주 3명"],
  ["2026. 6. 21.", "COMPETITION", "한강크로스스위밍챌린지", "완주 7명"],
  ["2026. 6. 27.", "COMPETITION", "제12회 서울특별시 연맹회장배 수영대회", "—" ]
];

// 학교/단체 교류전 로고 매핑 (제목에 포함된 키워드로 매칭)
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
function renderScheduleRow([date, status, title, result]) {
  const logos = getScheduleLogos(title);
  const logosHtml = logos.length
    ? logos.map((l, i) => `${i > 0 ? '<span class="schedule-logo-mark">×</span>' : ""}<img src="./assets/images/${l.src}" alt="${l.alt}" loading="lazy">`).join("")
    : "";
  return `<article class="schedule-row" role="row"><time>${date}</time><div class="schedule-logos${logos.length ? " has-logos" : ""}">${logosHtml}</div><div><p class="status ${scheduleStatusClass(status)}">${status}</p><h3>${title}</h3></div><p class="schedule-result">${result || ""}</p></article>`;
}
function renderSeasonAccordion(year, events, isOpen) {
  const rows = events.map(renderScheduleRow).join("");
  return `<div class="season-accordion" data-season="${year}"><button class="season-toggle" type="button" aria-expanded="${isOpen}" aria-controls="season-${year}"><span>${year} SEASON</span><span class="season-indicator">${isOpen ? "−" : "+"}</span></button><div class="season-events" id="season-${year}" role="region"${isOpen ? "" : " hidden"}>${rows}</div></div>`;
}

const scheduleSeasonsEl = document.querySelector("[data-schedule-seasons]");
if (scheduleSeasonsEl) {
  const events2026 = scheduleEvents.filter(([date]) => date.startsWith("2026."));
  const events2025 = scheduleEvents.filter(([date]) => date.startsWith("2025."));
  scheduleSeasonsEl.innerHTML =
    renderSeasonAccordion("2026", events2026, true) +
    renderSeasonAccordion("2025", events2025, false);

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

const scheduleList = document.querySelector("#schedule .event-list");
const teamShell = document.querySelector("#team .shell");
const recordShell = document.querySelector("#records .shell");
const newsGrid = document.querySelector("#news .news-grid");

// ---- RECORDS: 종목별 개인 기록 ----
const recordsData = {
  "50 FREE": [
    { athlete: "이정행", time: "24.43", seconds: 24.43, tags: ["PB"], meet: "2026 전국생활체육대축전 서울시 대표 선발전", date: "2026. 3. 7." },
    { athlete: "이정행", time: "24.50", seconds: 24.50, tags: ["SILVER"], meet: "2026 전국생활체육대축전", date: "2026. 4. 25." },
    { athlete: "이정행", time: "24.83", seconds: 24.83, tags: ["GR", "GOLD"], meet: "전국마스터즈 수영대회", date: "2025. 12. 13." },
    { athlete: "이정행", time: "25.00", seconds: 25.00, tags: ["5위"], meet: "2025 배럴 스프린트 챔피언십", date: "2025. 9. 27.", detail: "예선" },
    { athlete: "이정행", time: "25.11", seconds: 25.11, tags: ["SILVER"], meet: "2025 고양 전국 마스터즈 수영대회", date: "2025. 10. 18." },
    { athlete: "이정행", time: "25.40", seconds: 25.40, tags: ["6위"], meet: "2025 배럴 스프린트 챔피언십", date: "2025. 9. 27.", detail: "결승" },
    { athlete: "이정행", time: "26.18", seconds: 26.18, tags: ["SILVER"], meet: "제11회 서울특별시연맹회장배 수영대회", date: "2025. 6. 22." },
    { athlete: "이정행", time: "26.28", seconds: 26.28, tags: ["6위"], meet: "제45회 서울특별시장기 수영대회", date: "2024. 8. 3." },
    { athlete: "이정행", time: "26.61", seconds: 26.61, tags: ["BRONZE"], meet: "제8회 송파구연맹회장기 수영대회", date: "2024. 10. 27." },
    { athlete: "이정행", time: "26.84", seconds: 26.84, tags: ["11위"], meet: "2024 배럴 스프린트 챔피언십", date: "2024. 5. 25.", detail: "예선" },
    { athlete: "김민찬", time: "32.17", seconds: 32.17, tags: ["PB"], meet: "제31회 전국대학수영선수권대회", date: "2025. 11. 8." },
    { athlete: "김민찬", time: "32.79", seconds: 32.79, tags: [], meet: "제12회 서울특별시연맹회장배 수영대회", date: "2026. 6. 27." }
  ],
  "100 FREE": [
    { athlete: "이정행", time: "56.94", seconds: 56.94, tags: ["PB", "4위"], meet: "제31회 전국대학수영선수권대회", date: "2025. 11. 8." },
    { athlete: "이정행", time: "57.30", seconds: 57.30, tags: ["SILVER"], meet: "2025 고양 전국 마스터즈 수영대회", date: "2025. 10. 18." },
    { athlete: "김민찬", time: "1:14.18", seconds: 74.18, tags: ["PB"], meet: "제31회 전국대학수영선수권대회", date: "2025. 11. 8." }
  ],
  "50 FLY": [
    { athlete: "이정행", time: "25.87", seconds: 25.87, tags: ["SILVER"], meet: "2026 전국생활체육대축전", date: "2026. 4. 25." },
    { athlete: "이정행", time: "25.90", seconds: 25.90, tags: ["PB", "GOLD"], meet: "2026 전국생활체육대축전 서울시 대표 선발전", date: "2026. 3. 7." },
    { athlete: "이정행", time: "26.16", seconds: 26.16, tags: ["GR", "GOLD"], meet: "전국마스터즈 수영대회", date: "2025. 12. 13." },
    { athlete: "이정행", time: "27.91", seconds: 27.91, tags: ["GOLD"], meet: "제11회 서울특별시연맹회장배 수영대회", date: "2025. 6. 22." },
    { athlete: "이정행", time: "28.82", seconds: 28.82, tags: ["BRONZE"], meet: "제8회 송파구연맹회장기 수영대회", date: "2024. 10. 27." },
    { athlete: "이정행", time: "29.63", seconds: 29.63, tags: ["10위"], meet: "제45회 서울특별시장기 수영대회", date: "2024. 8. 3." },
    { athlete: "신재원", time: "30.33", seconds: 30.33, tags: [], meet: "제12회 서울특별시연맹회장배 수영대회", date: "2026. 6. 27." }
  ],
  "100 FLY": [
    { athlete: "이정행", time: "1:00.54", seconds: 60.54, tags: ["GOLD"], meet: "제31회 전국대학수영선수권대회", date: "2025. 11. 8." }
  ],
  "50 BREAST": [
    { athlete: "신재원", time: "30.13", seconds: 30.13, tags: ["GOLD"], meet: "2026 아레나 마스터즈 수영대회", date: "2026. 8. 8." },
    { athlete: "신재원", time: "30.45", seconds: 30.45, tags: ["GOLD"], meet: "제12회 서울특별시연맹회장배 수영대회", date: "2026. 6. 27." },
    { athlete: "신재원", time: "30.73", seconds: 30.73, tags: ["GR"], meet: "전국마스터즈 수영대회", date: "2025. 12. 13." },
    { athlete: "김민찬", time: "45.48", seconds: 45.48, tags: ["PB"], meet: "제12회 서울특별시연맹회장배 수영대회", date: "2026. 6. 27." }
  ],
  "100 BREAST": [
    { athlete: "신재원", time: "1:07.35", seconds: 67.35, tags: ["PB"], meet: "2026 아레나 마스터즈 수영대회", date: "2026. 8. 8." },
    { athlete: "신재원", time: "1:09.15", seconds: 69.15, tags: ["GR"], meet: "전국마스터즈 수영대회", date: "2025. 12. 13." }
  ],
  "RELAY": [
    { event: "혼계영 200m", team: "SNU Swimming Team", time: "2:31.78", seconds: 151.78, meet: "2026 아레나 마스터즈 수영대회", date: "2026. 8. 8.", members: "12명" }
  ]
};
const recordEventOrder = ["50 FREE", "100 FREE", "50 FLY", "100 FLY", "50 BREAST", "100 BREAST", "RELAY"];

function recordTagClass(tag) {
  if (tag === "PB") return "record-badge pb";
  if (tag === "GR") return "record-badge gr";
  if (tag === "GOLD") return "result-tag gold";
  return "result-tag";
}
function renderRecordTags(entry) {
  const tags = (entry.tags || []).map((tag) => `<span class="${recordTagClass(tag)}">${tag}</span>`).join("");
  return tags;
}
function renderRecordsTable(eventName) {
  if (eventName === "RELAY") {
    const rows = recordsData.RELAY.slice().sort((a, b) => a.seconds - b.seconds).map((r) =>
      `<tr><td>${r.event}</td><td>${r.team}</td><td>${r.time}</td><td>${r.meet}</td><td>${r.date}</td><td>${r.members}</td></tr>`
    ).join("");
    return `<p class="record-event-name">RELAY</p><div class="table-wrap"><table class="performance-table"><thead><tr><th>EVENT</th><th>TEAM</th><th>TIME</th><th>MEET</th><th>DATE</th><th>SWIMMERS</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  const entries = (recordsData[eventName] || []).slice().sort((a, b) => a.seconds - b.seconds);
  const rows = entries.map((r) =>
    `<tr><td>${r.athlete}</td><td>${r.time}</td><td>${renderRecordTags(r)}</td><td>${r.meet}${r.detail ? ` · ${r.detail}` : ""}</td><td>${r.date}</td></tr>`
  ).join("");
  return `<p class="record-event-name">${eventName}</p><div class="table-wrap"><table class="performance-table"><thead><tr><th>ATHLETE</th><th>TIME</th><th>RESULT</th><th>MEET</th><th>DATE</th></tr></thead><tbody>${rows}</tbody></table></div><p class="records-note">빠른 기록 순으로 정렬되어 있습니다.</p>`;
}

const recordsAppEl = document.querySelector("[data-records-app]");
if (recordsAppEl) {
  const tabsHtml = recordEventOrder.map((name, i) => `<button type="button" class="${i === 0 ? "is-active" : ""}" data-event-tab="${name}">${name}</button>`).join("");
  recordsAppEl.innerHTML = `<div class="records-toolbar"><div class="event-tabs" role="tablist" aria-label="종목 선택">${tabsHtml}</div></div><div data-records-table>${renderRecordsTable(recordEventOrder[0])}</div>`;
  const tableWrapEl = recordsAppEl.querySelector("[data-records-table]");
  recordsAppEl.querySelectorAll("[data-event-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      recordsAppEl.querySelectorAll("[data-event-tab]").forEach((b) => b.classList.toggle("is-active", b === btn));
      tableWrapEl.innerHTML = renderRecordsTable(btn.dataset.eventTab);
    });
  });
}


const galleryGrid = document.querySelector("#gallery .photo-grid");
const galleryFilter = document.querySelector("#gallery .gallery-filter");
if (galleryGrid && galleryFilter) {
  const cards = [
    { category:"training", label:"TRAINING", title:"\uC815\uAE30 \uD6C8\uB828", meta:"\uC11C\uC6B8\uB300\uD3EC\uC2A4\uCF54\uC218\uC601\uC7A5 (3F)", image:"trainp01.png" },
    { category:"competition", label:"COMPETITION", title:"\uB300\uD68C \uCD9C\uC804", meta:"COMPETITION PHOTO 02", image:"cp02.webp" },
    { category:"team", label:"TEAM", title:"\uD300 \uC0AC\uC9C4", meta:"TEAM PHOTO 03", image:"Teamphoto03.jpg" },
    { category:"events", label:"TEAM EVENT", title:"\uD300 \uD589\uC0AC", meta:"TEAM EVENT \u00B7 PHOTO 04", image:"tev04.jpg" },
    { category:"competition", label:"COMPETITION", title:"\uC81C31\uD68C \uC804\uAD6D\uB300\uD559\uC218\uC601\uC120\uC218\uAD8C\uB300\uD68C", meta:"2025. 11. 8. \u2013 11. 9.", image:"C32C.jpg" },
    { category:"events", label:"EXCHANGE EVENT", title:"\uC11C\uC6B8\uB300 \u00D7 \uCE74\uC774\uC2A4\uD2B8 \uC5F0\uD569\uAD50\uB958\uC804", meta:"2026. 5. 2. \u2013 5. 3.", image:"KAIST.jpg" },
    { category:"events", label:"EXCHANGE EVENT", title:"\uC11C\uC6B8\uB300 \u00D7 PolyU", meta:"2026. 5. 18. \u2013 5. 21.", image:"POLYU.jpg" }
  ];
  galleryGrid.innerHTML = cards.map((card) => `<figure class="gallery-item" data-category="${card.category}"><div class="gallery-media ${card.image ? "" : "gallery-media--placeholder"}">${card.image ? `<img src="./assets/images/${card.image}" alt="${card.title}" loading="lazy">` : card.fallback ? '<img src="./assets/images/university-logo.png" alt="Seoul National University logo">' : "PHOTO<br>PENDING"}</div><figcaption><p class="gallery-card-category">${card.label}</p><h3 class="gallery-card-title">${card.title}</h3><span class="gallery-card-meta">${card.meta}</span></figcaption></figure>`).join("") + '<p class="gallery-empty" hidden>해당 카테고리의 사진이 아직 없습니다.</p>';
  galleryFilter.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    const category = button.textContent.trim().toLowerCase();
    galleryFilter.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
    let visible = 0;
    galleryGrid.querySelectorAll(".gallery-item").forEach((card) => { const show = category === "all" || card.dataset.category === category; card.hidden = !show; if (show) visible += 1; });
    galleryGrid.querySelector(".gallery-empty").hidden = visible !== 0;
  }));
}

const training = document.querySelector("#training");
if (training) {
  const rows = training.querySelectorAll(".training-table .table-row");
  const pool = "\uC11C\uC6B8\uB300\uD3EC\uC2A4\uCF54\uC218\uC601\uC7A5 (3F)";
  training.querySelector(".section-intro").textContent = "\uC815\uAE30 \uD300 \uD6C8\uB828\uC740 \uB808\uC778\uBCC4 \uC6B4\uB3D9 \uAC15\uB3C4\uC640 \uAC01\uC790\uC758 \uBAA9\uD45C\uB97C \uACE0\uB824\uD574 \uC6B4\uC601\uB429\uB2C8\uB2E4.";
  if (rows[1]) rows[1].innerHTML = `<span>TUE</span><span>17:00\u201318:30</span><span>REGULAR TRAINING</span><span>${pool}</span>`;
  if (rows[2]) rows[2].innerHTML = `<span>THU</span><span>17:00\u201318:30</span><span>REGULAR TRAINING</span><span>${pool}</span>`;
  if (rows[3]) rows[3].remove();
  const notes = training.querySelectorAll(".training-notes > div");
  if (notes[0]) notes[0].innerHTML = `<b>GROUPS</b><p><strong>\uC0C1\uAE09 \uB808\uC778</strong><br><strong>\uC911\uAE09/\uD558\uAE09 \uB808\uC778</strong><br><small>ADVANCED LANE \u00B7 INTERMEDIATE / DEVELOPMENT LANE</small></p>`;
  if (notes[1]) notes[1].innerHTML = `<b>STRUCTURE</b><p>\uB2E4\uC591\uD55C Drill \u00B7 Interval \uC911\uC2EC \uD6C8\uB828<br><small>DRILLS \u00B7 INTERVALS \u00B7 TECHNIQUE \u00B7 ENDURANCE</small></p>`;
  if (notes[2]) notes[2].innerHTML = `<b>DRYLAND</b><p><strong>TBD</strong><br><small>\uCD94\uD6C4 \uC548\uB0B4 \uC608\uC815</small></p>`;
}

const infoItems = document.querySelectorAll(".info-grid article");
if (infoItems[1]) infoItems[1].innerHTML = '<p class="eyebrow">LATEST RESULT</p><strong>2026\uB144 \uC804\uAD6D\uC0DD\uD65C\uCCB4\uC721\uB300\uCD95\uC804 \uC11C\uC6B8\uC2DC \uB300\uD45C \uC120\uBC1C\uC804 \uC218\uC601\uB300\uD68C</strong><span>FREESTYLE · 1ST / BUTTERFLY · 2ND</span><a href="#records">VIEW RESULTS <b>↗</b></a>';
const featuredAchievement = document.querySelector(".highlight-record");
if (featuredAchievement) featuredAchievement.innerHTML = '<p class="eyebrow accent">FEATURED ACHIEVEMENT</p><p class="record-event">\uC81C31\uD68C \uC804\uAD6D\uB300\uD559\uC218\uC601\uC120\uC218\uAD8C\uB300\uD68C</p><strong>JOINT 1ST</strong><div><span>DIVISIONS</span><b>MEN\'S DIV II · WOMEN\'S DIV II</b></div><div><span>DATE</span><b>2025. 11. 8. – 11. 9.</b></div><a href="#records">VIEW RESULTS <b>↗</b></a>';

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: 0.08 });
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
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
  homeRevealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const homeRevealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting || document.body.classList.contains("detail-mode")) return;
    entry.target.classList.add("is-visible");
    homeRevealObserver.unobserve(entry.target);
  }), { threshold: 0.12 });
  homeRevealItems.forEach((item) => homeRevealObserver.observe(item));
}

// Verified leadership and performance archive (Unicode escapes preserve Korean labels across local environments).
// A 4th array item is an optional profile photo filename (in assets/images/); leaders without one fall back to the university-logo placeholder.
const verifiedTeam = [
  ["CAPTAIN","\uAE40\uBBFC\uCC2C","\uC8FC\uC7A5"], ["VICE CAPTAIN","\uC774\uC815\uD589","\uBD80\uC8FC\uC7A5"],
  ["TRAINING DIRECTOR","\uC2E0\uC7AC\uC6D0","\uD6C8\uB828\uBD80\uC7A5","SHINPROF.png"], ["TREASURER","\uCD5C\uC138\uB098","\uCD1D\uBB34"]
];

if (teamShell) {
  const fallback = '<div class="member-photo no-photo"><img src="./assets/images/university-logo.png" alt="Seoul National University logo"></div>';
  const leaders = verifiedTeam.map(([role, name, ko, photo]) => {
    const photoHtml = photo
      ? `<div class="member-photo has-photo"><img src="./assets/images/${photo}" alt="${name} \uD504\uB85C\uD544 \uC0AC\uC9C4" loading="lazy"></div>`
      : fallback;
    return `<article class="leader">${photoHtml}<p class="leader-role">${role}</p><h3>${name}</h3><p class="ko-role">${ko}</p></article>`;
  }).join("");
  const legacy = `<article class="legacy-note"><div><p class="eyebrow">TEAM LEGACY</p><strong>이다린</strong></div><div><p>서울대학교 수영부에는 국가대표 및 상비군 출신 부원들이 함께해 왔으며, 이다린 선수는 2014 인천아시안게임 여자 400m 혼계영에 출전해 한국신기록 4분 04초 82를 세우며 은메달을 획득했습니다.</p><p class="legacy-pending">2014 INCHEON ASIAN GAMES · WOMEN'S 4×100M MEDLEY RELAY · SILVER</p></div></article>`;
  teamShell.innerHTML = `<div class="section-head"><div><p class="section-number">02</p><p class="eyebrow accent">TEAM</p></div><h2>MEET<br>THE TEAM.</h2></div><div class="filter-bar team-tabs" role="tablist"><button class="is-active" data-team-tab="leadership">LEADERSHIP</button><button data-team-tab="members">MEMBERS</button><button data-team-tab="legacy">LEGACY</button></div><div class="team-directory-view" data-team-view="leadership"><div class="leadership-directory">${leaders}</div></div><div class="team-directory-view member-directory" data-team-view="members" hidden><p>MEMBER DIRECTORY</p><p>Verified member information will be added as it becomes available.</p></div><div class="team-directory-view" data-team-view="legacy" hidden>${legacy}</div>`;
  teamShell.querySelectorAll("[data-team-tab]").forEach((button) => button.addEventListener("click", () => { const tab=button.dataset.teamTab; teamShell.querySelectorAll("[data-team-tab]").forEach((item)=>item.classList.toggle("is-active",item===button)); teamShell.querySelectorAll("[data-team-view]").forEach((view)=>view.hidden=view.dataset.teamView!==tab); }));
}

const meetNames = {
  seoulTrials:"2026 \uC804\uAD6D\uC0DD\uD65C\uCCB4\uC721\uB300\uCD95\uC804 \uC11C\uC6B8\uC2DC\uB300\uD45C\uC120\uBC1C\uC804", national:"2026 \uC804\uAD6D\uC0DD\uD65C\uCCB4\uC721\uB300\uCD95\uC804",
  masters:"\uC81C30\uD68C \uC77C\uB958\uACBD\uC81C\uB3C4\uC2DC\uB300\uC804 \uC804\uAD6D\uB9C8\uC2A4\uD130\uC988 \uC218\uC601\uB300\uD68C", barrel25:"2025 \uBC30\uB7F4 \uC2A4\uD504\uB9B0\uD2B8 \uCC54\uD53C\uC5B8\uC2ED", goyang:"2025 \uACE0\uC591 \uC804\uAD6D \uB9C8\uC2A4\uD130\uC988 \uC218\uC601\uB300\uD68C", seoul11:"\uC81C11\uD68C \uC11C\uC6B8\uD2B9\uBCC4\uC2DC\uC5F0\uB9F9\uD68C\uC7A5\uBC30 \uC218\uC601\uB300\uD68C (\uD55C\uC911 \uC2A4\uD3EC\uCE20\uAD50\uB958)", mayor45:"\uC81C45\uD68C \uC11C\uC6B8\uD2B9\uBCC4\uC2DC\uC7A5\uAE30 \uC218\uC601\uB300\uD68C", songpa8:"\uC81C8\uD68C \uC1A1\uD30C\uAD6C\uC5F0\uB9F9\uD68C\uC7A5\uAE30 \uC218\uC601\uB300\uD68C", barrel24:"2024 \uBC30\uB7F4 \uC2A4\uD504\uB9B0\uD2B8 \uCC54\uD53C\uC5B8\uC2ED", uni31:"\uC81C31\uD68C \uC804\uAD6D\uB300\uD559 \uC218\uC601\uC120\uC218\uAD8C\uB300\uD68C", arena:"2026 \uC544\uB808\uB098 \uB9C8\uC2A4\uD130\uC988 \uC218\uC601\uB300\uD68C", seoul12:"\uC81C12\uD68C \uC11C\uC6B8\uD2B9\uBCC4\uC2DC\uC5F0\uB9F9\uD68C\uC7A5\uBC30 \uC218\uC601\uB300\uD68C"
};

// ---- HOME "TEAM UPDATES" CAROUSEL ----
// Slide count is read from the DOM (data-carousel-track children), so adding or
// removing <article> cards in index.html is automatically reflected \u2014 nothing here
// needs to change.
(function initHomeNewsCarousel() {
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

  let index = 0;
  let timer = null;
  let isPlaying = true;

  slides.forEach((slide, i) => {
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${i + 1} / ${slides.length}`);
  });

  dotsWrap.innerHTML = slides
    .map((_, i) => `<button type="button" role="tab" aria-selected="false" aria-label="${i + 1}\uBC88\uC9F8 \uCE74\uB4DC\uB85C \uC774\uB3D9" data-carousel-dot="${i}"></button>`)
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
      toggleBtn.setAttribute("aria-label", playing ? "\uC790\uB3D9 \uC7AC\uC0DD \uC77C\uC2DC\uC815\uC9C0" : "\uC790\uB3D9 \uC7AC\uC0DD \uC2DC\uC791");
      if (toggleLabel) toggleLabel.textContent = playing ? "\uC77C\uC2DC\uC815\uC9C0" : "\uC7AC\uC0DD";
      if (toggleIcon) toggleIcon.textContent = playing ? "\u275A\u275A" : "\u25B6";
    }
    if (playing) startAutoplay(); else stopAutoplay();
  }

  dots.forEach((dot) => dot.addEventListener("click", () => { goTo(Number(dot.dataset.carouselDot)); if (isPlaying) startAutoplay(); }));
  if (prevBtn) prevBtn.addEventListener("click", () => { prev(); if (isPlaying) startAutoplay(); });
  if (nextBtn) nextBtn.addEventListener("click", () => { next(); if (isPlaying) startAutoplay(); });
  if (toggleBtn) toggleBtn.addEventListener("click", () => setPlaying(!isPlaying));

  // Pause on hover, resume on mouse leave.
  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", () => { if (isPlaying) startAutoplay(); });
  // Pause while any control/link inside has keyboard focus; resume once focus leaves.
  root.addEventListener("focusin", stopAutoplay);
  root.addEventListener("focusout", (event) => {
    if (isPlaying && !root.contains(event.relatedTarget)) startAutoplay();
  });

  // Touch swipe (mobile): left swipe -> next, right swipe -> previous.
  let touchStartX = 0;
  let touchStartY = 0;
  let touchTracking = false;
  track.addEventListener("touchstart", (event) => {
    const t = event.touches[0];
    touchStartX = t.clientX; touchStartY = t.clientY; touchTracking = true;
    stopAutoplay();
  }, { passive: true });
  track.addEventListener("touchend", (event) => {
    if (!touchTracking) return;
    touchTracking = false;
    const t = event.changedTouches[0];
    const deltaX = t.clientX - touchStartX;
    const deltaY = t.clientY - touchStartY;
    const SWIPE_THRESHOLD = 40;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) next(); else prev();
    }
    if (isPlaying) startAutoplay();
  }, { passive: true });

  goTo(0);
  setPlaying(true);
})();

// ---- NEWS MODAL ----
// Card data (title/date·category/image/summary) is read straight from each
// article's DOM at click time, so cards can be added or removed in the NEWS
// section markup without touching this script. A future full article body can
// be added per-card via a `data-news-body` attribute on the <article> — the
// modal will pick it up automatically; until then it shows a placeholder note.
(function initNewsModal() {
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
  const BODY_FALLBACK = "자세한 본문은 준비되는 대로 업데이트됩니다.";
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
    document.addEventListener("keydown", handleKeydown);
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
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
})();
