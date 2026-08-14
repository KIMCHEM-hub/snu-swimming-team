// ---- i18n (한국어/영어 토글) ----
// Zero dependencies. Dictionary is inlined (not fetched) so `?lang=en` never flashes
// Korean before a network round-trip resolves. Proper nouns (names, university name,
// Instagram handles, email) are intentionally left out of the dictionary — callers just
// don't wrap them in t()/pick().
const STORAGE_KEY = "snu-swim-lang";

const DICT = {
  ko: {
    "a11y.skipLink": "본문으로 건너뛰기",
    "a11y.openMenu": "메뉴 열기",
    "a11y.brandHome": "서울대학교 수영부 메인으로 이동",
    "a11y.mainNav": "주요 메뉴",
    "nav.notices": "공지사항",
    "nav.members": "부원 전용",
    "nav.trainingEvaluation": "훈련 평가",
    "common.close": "닫기",
    "members.loginTitle": "부원 로그인",
    "members.loginPrompt": "등록된 이메일과 비밀번호로 로그인해 주세요.",
    "members.email": "이메일",
    "members.password": "비밀번호",
    "members.loginButton": "로그인",
    "members.loggedIn": "로그인되었습니다",
    "members.name": "이름",
    "members.athleteId": "선수 ID",
    "members.logout": "로그아웃",
    "members.loading": "불러오는 중…",
    "members.profileLoadError": "부원 정보를 불러오지 못했습니다. 관리자에게 문의해 주세요.",
    "members.noProfile": "로그인 이메일과 일치하는 부원 정보를 찾지 못했습니다.",
    "members.noProfileName": "등록 정보 없음",
    "members.invalidCredentials": "이메일 또는 비밀번호를 확인해 주세요.",
    "members.logoutError": "로그아웃하지 못했습니다. 다시 시도해 주세요.",
    "members.profile": "내 프로필",
    "members.trainingEvaluation": "훈련 평가",
    "members.results": "대회 실적",
    "members.trainingPending": "준비 중입니다",
    "members.resultsTitle": "대회 실적",
    "members.noRecords": "등록된 대회 실적이 없습니다.",
    "members.recordEvent": "종목",
    "members.recordTime": "기록",
    "members.recordMeet": "대회",
    "members.recordDate": "날짜",
    "members.studentId": "학번",
    "members.contact": "연락처",
    "members.bio": "자기소개",
    "members.sns": "SNS",
    "team.bio": "자기소개",
    "team.sns": "SNS",
    "about.lead": "서울대학교 수영부는 1983년 창단된 서울대학교의 대표 수영 운동부입니다. 오랜 전통을 바탕으로 개인의 기록 향상과 체력 증진을 추구하는 동시에, 함께 훈련하며 책임감과 팀워크를 기르는 것을 목표로 하고 있습니다.",
    "about.body": "현재 약 30~40명의 부원이 활동하고 있으며, 선수 경력자부터 수영을 체계적으로 배우고자 하는 학생들까지 다양한 구성원이 함께하고 있습니다. 체계적인 훈련과 상호 피드백을 통해 각자의 목표에 맞춰 꾸준히 성장하고 있습니다.",
    "join.lead": "서울대학교 공식 수영부와 함께 훈련하고 활동할 새로운 팀원을 모집합니다.",
    "join.eligibility": "서울대학교 소속 구성원",
    "join.commitment": "한 학기",
    "join.requirement": "2가지 이상의 영법을 구사",
    "join.howToApply": "JOIN THE TEAM 설문 참여",
    "join.recruitmentInfoAria": "추후 모집 상세 정보 연결",
    "carousel.homeAria": "TEAM UPDATES 카드 슬라이드 (6초마다 자동 전환)",
    "carousel.newsAria": "NEWS 카드 슬라이드 (6초마다 자동 전환)",
    "carousel.prev": "이전 카드",
    "carousel.next": "다음 카드",
    "carousel.dotsAria": "카드로 바로 이동",
    "carousel.pause": "일시정지",
    "carousel.play": "재생",
    "carousel.pauseAutoplay": "자동 재생 일시정지",
    "carousel.startAutoplay": "자동 재생 시작",
    "carousel.goToCard": "{{n}}번째 카드로 이동",
    "records.sortNote": "빠른 기록 순으로 정렬되어 있습니다.",
    "notices.empty": "등록된 공지사항이 없습니다.",
    "gallery.empty": "해당 카테고리의 사진이 아직 없습니다.",
    "training.intro": "정기 팀 훈련은 레인별 운동 강도와 각자의 목표를 고려해 운영됩니다.",
    "training.groups.advanced": "상급 레인",
    "training.groups.intermediate": "중급/하급 레인",
    "training.structure.body": "다양한 Drill · Interval 중심 훈련",
    "training.dryland.captionFallback": "추후 안내 예정",
    "weekly.pending": "이번 주 훈련 세션 준비 중",
    "weekly.day.화": "화요일",
    "weekly.day.목": "목요일",
    "team.membersNoteFallback": "확인된 부원 정보는 준비되는 대로 업데이트됩니다.",
    "team.profilePhotoAlt": "{{name}} 프로필 사진",
    "news.bodyFallback": "자세한 본문은 준비되는 대로 업데이트됩니다.",
    "footer.snuHomepage": "서울대학교 홈페이지",
    "footer.copyrightSuffix": "SEOUL NATIONAL UNIVERSITY OFFICIAL SWIMMING TEAM. 모든 권리 보유."
  },
  en: {
    "a11y.skipLink": "Skip to main content",
    "a11y.openMenu": "Open menu",
    "a11y.brandHome": "Go to Seoul National University Swimming Team home",
    "a11y.mainNav": "Main navigation",
    "nav.notices": "NOTICES",
    "nav.members": "MEMBERS",
    "nav.trainingEvaluation": "TRAINING EVALUATION",
    "common.close": "Close",
    "members.loginTitle": "Member login",
    "members.loginPrompt": "Sign in with your registered email and password.",
    "members.email": "EMAIL",
    "members.password": "PASSWORD",
    "members.loginButton": "LOG IN",
    "members.loggedIn": "You are signed in",
    "members.name": "NAME",
    "members.athleteId": "ATHLETE ID",
    "members.logout": "LOG OUT",
    "members.loading": "Loading…",
    "members.profileLoadError": "We could not load your member information. Please contact an administrator.",
    "members.noProfile": "We could not find member information matching your sign-in email.",
    "members.noProfileName": "No member record",
    "members.invalidCredentials": "Please check your email and password.",
    "members.logoutError": "We could not sign you out. Please try again.",
    "members.profile": "MY PROFILE",
    "members.trainingEvaluation": "TRAINING EVALUATION",
    "members.results": "COMPETITION RESULTS",
    "members.trainingPending": "Coming soon",
    "members.resultsTitle": "COMPETITION RESULTS",
    "members.noRecords": "No competition results are registered.",
    "members.recordEvent": "EVENT",
    "members.recordTime": "TIME",
    "members.recordMeet": "MEET",
    "members.recordDate": "DATE",
    "members.studentId": "STUDENT ID",
    "members.contact": "CONTACT",
    "members.bio": "BIO",
    "members.sns": "SNS",
    "team.bio": "BIO",
    "team.sns": "SNS",
    "about.lead": "Founded in 1983, the Seoul National University Swimming Team is the university's official competitive swimming club. Built on a long tradition, we pursue personal improvement and physical fitness while training together to build responsibility and teamwork.",
    "about.body": "About 30 to 40 members are currently active, ranging from former competitive swimmers to students who want to learn to swim systematically. Through structured training and mutual feedback, each member steadily grows toward their own goals.",
    "join.lead": "We're recruiting new members to train and compete with the official Seoul National University Swimming Team.",
    "join.eligibility": "Current SNU students, faculty, or staff",
    "join.commitment": "One semester",
    "join.requirement": "Able to swim two or more strokes",
    "join.howToApply": "Apply via the JOIN THE TEAM form",
    "join.recruitmentInfoAria": "Recruitment details link (coming soon)",
    "carousel.homeAria": "TEAM UPDATES card slideshow (auto-advances every 6 seconds)",
    "carousel.newsAria": "NEWS card slideshow (auto-advances every 6 seconds)",
    "carousel.prev": "Previous card",
    "carousel.next": "Next card",
    "carousel.dotsAria": "Jump to card",
    "carousel.pause": "Pause",
    "carousel.play": "Play",
    "carousel.pauseAutoplay": "Pause autoplay",
    "carousel.startAutoplay": "Start autoplay",
    "carousel.goToCard": "Go to card {{n}}",
    "records.sortNote": "Sorted by fastest time.",
    "notices.empty": "No notices have been posted yet.",
    "gallery.empty": "No photos in this category yet.",
    "training.intro": "Regular team training is organized by lane, based on intensity level and each member's goals.",
    "training.groups.advanced": "Advanced Lane",
    "training.groups.intermediate": "Intermediate / Development Lane",
    "training.structure.body": "Varied Drill- and Interval-focused training",
    "training.dryland.captionFallback": "Details to be announced",
    "weekly.pending": "This week's session details are being prepared",
    "weekly.day.화": "TUESDAY",
    "weekly.day.목": "THURSDAY",
    "team.membersNoteFallback": "Verified member information will be added as it becomes available.",
    "team.profilePhotoAlt": "{{name}} profile photo",
    "news.bodyFallback": "The full article will be updated soon.",
    "footer.snuHomepage": "SNU HOMEPAGE",
    "footer.copyrightSuffix": "SEOUL NATIONAL UNIVERSITY OFFICIAL SWIMMING TEAM. All rights reserved."
  }
};

let currentLang = "ko";

export function getLang() {
  return currentLang;
}

// t(key, vars?) — dictionary lookup with {{token}} interpolation. Falls back to the
// Korean string if the current language is missing a key (never returns blank), and to
// the raw key itself only if Korean is missing it too (should never happen in practice).
export function t(key, vars) {
  const dict = DICT[currentLang] || DICT.ko;
  let str = dict[key];
  if (str === undefined) str = DICT.ko[key];
  if (str === undefined) return key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      str = str.replace(new RegExp(`{{${k}}}`, "g"), vars[k]);
    });
  }
  return str;
}

// pick(obj, field) — CMS sibling-field lookup (e.g. field "title" reads obj.titleEn when
// English is active). Falls back to the Korean field whenever the English sibling is
// missing or blank, so content renders correctly before an admin fills in translations.
export function pick(obj, field) {
  if (!obj) return "";
  if (currentLang === "en") {
    const enVal = obj[`${field}En`];
    if (enVal !== undefined && enVal !== null && String(enVal).trim() !== "") return enVal;
  }
  const val = obj[field];
  return val === undefined || val === null ? "" : val;
}

// applyStaticTranslations(root?) — scans data-i18n / data-i18n-html / data-i18n-attr
// attributes under root (defaults to the whole document) and fills them from the
// dictionary. Safe to call repeatedly (e.g. once per langchange).
export function applyStaticTranslations(root) {
  const scope = root || document;
  scope.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  scope.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(",").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

function updateToggleUI() {
  document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === currentLang));
  });
}

// setLang(next) — switches language in place: no reload, hash (current section) is left
// untouched, only the ?lang= query param is swapped via replaceState. Fires "langchange"
// so main.js can re-render CMS-driven sections without re-fetching (same JSON already
// holds both languages).
export function setLang(next) {
  if (next !== "ko" && next !== "en") return;
  if (next === currentLang) return;
  currentLang = next;
  try { window.localStorage.setItem(STORAGE_KEY, next); } catch (err) { /* private mode etc. — non-fatal */ }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch (err) { /* malformed URL — non-fatal, in-memory lang state still updates */ }
  document.documentElement.setAttribute("lang", next);
  updateToggleUI();
  // Static copy belongs to this module, so it is updated synchronously with the
  // button state. CMS-driven sections are re-rendered by main.js below.
  // Keeping these responsibilities separate means a delayed content fetch cannot
  // leave visible static text in the previous language.
  applyStaticTranslations();
  window.dispatchEvent(new CustomEvent("langchange", { detail: { lang: next } }));
}

// initLang() — resolves the starting language (?lang= > localStorage > "ko"), wires the
// KR/EN toggle buttons, and applies it. Call once at boot, before the first render.
export function initLang() {
  let lang = "ko";
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (fromUrl === "en" || fromUrl === "ko") {
      lang = fromUrl;
    } else {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ko") lang = stored;
    }
  } catch (err) { /* private mode etc. — default to ko */ }

  currentLang = lang;
  try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (err) { /* non-fatal */ }
  document.documentElement.setAttribute("lang", lang);

  document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
  updateToggleUI();
}
