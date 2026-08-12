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
  ["2025. 5. 11.", "JOINT TRAINING", "\uD55C\uAD6D\uC678\uB300 \uC218\uC601\uBD80 \uC5F0\uD569\uD6C8\uB828", ""],
  ["2025. 5. 15. ??5. 17.", "COMPETITION", "2025 \uACBD\uAE30\uB3C4 \uB3C4\uBBFC\uCCB4\uC804", "\uC6B0\uC2B9 (4\uAD00\uC655)"],
  ["2025. 5. 30. ??6. 1.", "COMPETITION", "\uC81C2\uD68C \uC26C\uC5C4\uC26C\uC5C4 \uD55C\uAC15 3\uC885 \uCD95\uC81C", ""],
  ["2025. 6. 21. ??6. 22.", "COMPETITION", "2025 \uD55C\uAC15\uD06C\uB85C\uC2A4\uC704\uBC0D\uCC4C\uB9B0\uC9C0", ""],
  ["2025. 9. 27. ??9. 28.", "COMPETITION", "2025 \uBC30\uB7F4 \uC2A4\uD504\uB9B0\uD2B8 \uCC54\uD53C\uC5B8\uC2ED", ""],
  ["2025. 10. 19.", "COMPETITION", "\uC81C1\uD68C \uB178\uC6D0\uAD6C\uCCAD\uC7A5\uBC30 \uBC0F \uC81C8\uD68C \uC5F0\uB9F9\uD68C\uC7A5\uBC30 \uC218\uC601\uB300\uD68C", ""],
  ["2025. 11. 8. ??11. 9.", "COMPETITION", "\uC81C31\uD68C \uC804\uAD6D\uB300\uD559\uC218\uC601\uC120\uC218\uAD8C\uB300\uD68C", "\uACF5\uB3D9 1\uC704 (\uB0A8\uC790 2\uBD80 夷?\uC5EC\uC790 2\uBD80)"],
  ["2025. 11. 14.", "JOINT TRAINING", "\uC2A4\uB204\uD480(\uC911\uC559 \uC218\uC601\uB3D9\uC544\uB9AC) \uC5F0\uD569\uD6C8\uB828", ""],
  ["2025. 11. 20. ??11. 24.", "COMPETITION", "\uC804\uBB38\uCCB4\uC721\uC778 \uC804\uAD6D\uB300\uD68C(MBC\uBC30)", "3\uC704"],
  ["2026. 3. 8.", "COMPETITION", "2026\uB144 \uC804\uAD6D\uC0DD\uD65C\uCCB4\uC721\uB300\uCD95\uC804 \uC11C\uC6B8\uC2DC \uB300\uD45C \uC120\uBC1C\uC804 \uC218\uC601\uB300\uD68C", "\uC790\uC720\uD615 1\uC704 夷?\uC811\uC601 2\uC704"],
  ["2026. 5. 2. ??5. 3.", "EXCHANGE EVENT", "\uC11C\uC6B8\uB300 ??\uCE74\uC774\uC2A4\uD2B8 \uC5F0\uD569\uAD50\uB958\uC804", "\uCE74\uC774\uC2A4\uD2B8(17\uBA85) 夷?\uC11C\uC6B8\uB300(8\uBA85)"],
  ["2026. 5. 18. ??5. 21.", "EXCHANGE EVENT", "\uC11C\uC6B8\uB300 ??PolyU", "PolyU(8\uBA85) 夷?\uC11C\uC6B8\uB300(6\uBA85)"],
  ["2026. 6. 5. ??6. 7.", "COMPETITION", "\uC81C3\uD68C \uC218\uC601\uC5F0\uD569 \uD55C\uAC15 3\uC885 \uCD95\uC81C", "\uC644\uC8FC (3\uBA85)"],
  ["2026. 6. 21.", "COMPETITION", "\uD55C\uAC15\uD06C\uB85C\uC2A4\uC2A4\uC704\uBC0D\uCC4C\uB9B0\uC9C0", "\uC644\uC8FC (7\uBA85) 夷?3\uC704 \uC218\uC0C1 (\uD14C\uC2A4\uD2B8 \uB300\uD68C)"],
  ["2026. 6. 27.", "COMPETITION", "\uC81C12\uD68C \uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC5F0\uB9F9\uD68C\uC7A5\uBC30 \uC218\uC601\uB300\uD68C", "" ]
];

const scheduleList = document.querySelector("#schedule .event-list");
const teamShell = document.querySelector("#team .shell");
const recordShell = document.querySelector("#records .shell");
const newsGrid = document.querySelector("#news .news-grid");


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
  galleryGrid.innerHTML = cards.map((card) => `<figure class="gallery-item" data-category="${card.category}"><div class="gallery-media ${card.image ? "" : "gallery-media--placeholder"}">${card.image ? `<img src="./assets/images/${card.image}" alt="${card.title}" loading="lazy">` : card.fallback ? '<img src="./assets/images/university-logo.png" alt="Seoul National University logo">' : "PHOTO<br>PENDING"}</div><figcaption><p class="gallery-card-category">${card.label}</p><h3 class="gallery-card-title">${card.title}</h3><span class="gallery-card-meta">${card.meta}</span></figcaption></figure>`).join("") + '<p class="gallery-empty" hidden>??뽯뻻?????????곷뮸??덈뼄.</p>';
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
if (infoItems[1]) infoItems[1].innerHTML = '<p class="eyebrow">LATEST RESULT</p><strong>2026\uB144 \uC804\uAD6D\uC0DD\uD65C\uCCB4\uC721\uB300\uCD95\uC804 \uC11C\uC6B8\uC2DC \uB300\uD45C \uC120\uBC1C\uC804 \uC218\uC601\uB300\uD68C</strong><span>FREESTYLE 夷?1ST / BUTTERFLY 夷?2ND</span><a href="#records">VIEW RESULTS <b>??/b></a>';
const featuredAchievement = document.querySelector(".highlight-record");
if (featuredAchievement) featuredAchievement.innerHTML = '<p class="eyebrow accent">FEATURED ACHIEVEMENT</p><p class="record-event">\uC81C31\uD68C \uC804\uAD6D\uB300\uD559\uC218\uC601\uC120\uC218\uAD8C\uB300\uD68C</p><strong>JOINT 1ST</strong><div><span>DIVISIONS</span><b>MEN???II 夷?WOMEN???II</b></div><div><span>DATE</span><b>2025. 11. 8. ??11. 9.</b></div><a href="#records">VIEW RESULTS <b>??/b></a>';

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
const verifiedTeam = [
  ["CAPTAIN","\uAE40\uBBFC\uCC2C","\uC8FC\uC7A5"], ["VICE CAPTAIN","\uC774\uC815\uD589","\uBD80\uC8FC\uC7A5"],
  ["TRAINING DIRECTOR","\uC2E0\uC7AC\uC6D0","\uD6C8\uB828\uBD80\uC7A5"], ["TREASURER","\uCD5C\uC138\uB098","\uCD1D\uBB34"]
];

if (teamShell) {
  const fallback = '<div class="member-photo no-photo"><img src="./assets/images/university-logo.png" alt="Seoul National University logo"></div>';
  const leaders = verifiedTeam.map(([role, name, ko]) => `<article class="leader">${fallback}<p class="leader-role">${role}</p><h3>${name}</h3><p class="ko-role">${ko}</p></article>`).join("");
  const legacy = `<article class="legacy-note"><div><p class="eyebrow">TEAM LEGACY</p><strong>이다린</strong></div><div><p>서울대학교 수영부에는 국가대표 및 상비군 출신 부원들이 함께해 왔으며, 이다린 선수는 2014 인천아시안게임 여자 400m 혼계영에 출전해 한국신기록 4분 04초 82를 세우며 은메달을 획득했습니다.</p><p class="legacy-pending">2014 INCHEON ASIAN GAMES · WOMEN'S 4×100M MEDLEY RELAY · SILVER</p></div></article>`;
  teamShell.innerHTML = `<div class="section-head"><div><p class="section-number">02</p><p class="eyebrow accent">TEAM</p></div><h2>MEET<br>THE TEAM.</h2></div><div class="filter-bar team-tabs" role="tablist"><button class="is-active" data-team-tab="leadership">LEADERSHIP</button><button data-team-tab="members">MEMBERS</button><button data-team-tab="legacy">LEGACY</button></div><div class="team-directory-view" data-team-view="leadership"><div class="leadership-directory">${leaders}</div></div><div class="team-directory-view member-directory" data-team-view="members" hidden><p>MEMBER DIRECTORY</p><p>Verified member information will be added as it becomes available.</p></div><div class="team-directory-view" data-team-view="legacy" hidden>${legacy}</div>`;
  teamShell.querySelectorAll("[data-team-tab]").forEach((button) => button.addEventListener("click", () => { const tab=button.dataset.teamTab; teamShell.querySelectorAll("[data-team-tab]").forEach((item)=>item.classList.toggle("is-active",item===button)); teamShell.querySelectorAll("[data-team-view]").forEach((view)=>view.hidden=view.dataset.teamView!==tab); }));
}

const meetNames = {
  seoulTrials:"2026 \uC804\uAD6D\uC0DD\uD65C\uCCB4\uC721\uB300\uCD95\uC804 \uC11C\uC6B8\uC2DC\uB300\uD45C\uC120\uBC1C\uC804", national:"2026 \uC804\uAD6D\uC0DD\uD65C\uCCB4\uC721\uB300\uCD95\uC804",
  masters:"\uC81C30\uD68C \uC77C\uB958\uACBD\uC81C\uB3C4\uC2DC\uB300\uC804 \uC804\uAD6D\uB9C8\uC2A4\uD130\uC988 \uC218\uC601\uB300\uD68C", barrel25:"2025 \uBC30\uB7F4 \uC2A4\uD504\uB9B0\uD2B8 \uCC54\uD53C\uC5B8\uC2ED", goyang:"2025 \uACE0\uC591 \uC804\uAD6D \uB9C8\uC2A4\uD130\uC988 \uC218\uC601\uB300\uD68C", seoul11:"\uC81C11\uD68C \uC11C\uC6B8\uD2B9\uBCC4\uC2DC\uC5F0\uB9F9\uD68C\uC7A5\uBC30 \uC218\uC601\uB300\uD68C (\uD55C\uC911 \uC2A4\uD3EC\uCE20\uAD50\uB958)", mayor45:"\uC81C45\uD68C \uC11C\uC6B8\uD2B9\uBCC4\uC2DC\uC7A5\uAE30 \uC218\uC601\uB300\uD68C", songpa8:"\uC81C8\uD68C \uC1A1\uD30C\uAD6C\uC5F0\uB9F9\uD68C\uC7A5\uAE30 \uC218\uC601\uB300\uD68C", barrel24:"2024 \uBC30\uB7F4 \uC2A4\uD504\uB9B0\uD2B8 \uCC54\uD53C\uC5B8\uC2ED", uni31:"\uC81C31\uD68C \uC804\uAD6D\uB300\uD559 \uC218\uC601\uC120\uC218\uAD8C\uB300\uD68C", arena:"2026 \uC544\uB808\uB098 \uB9C8\uC2A4\uD130\uC988 \uC218\uC601\uB300\uD68C", seoul12:"\uC81C12\uD68C \uC11C\uC6B8\uD2B9\uBCC4\uC2DC\uC5F0\uB9F9\uD68C\uC7A5\uBC30 \uC218\uC601\uB300\uD68C"
};
