# snuswimmingteam.org — 프로젝트 컨텍스트

> 다른 에이전트(Codex 등)가 이 파일만 읽고 바로 작업을 이어갈 수 있도록 정리한 문서.
> 코드 자체가 최종 진실이며, 이 문서는 탐색 시간을 줄이기 위한 지도다. 불일치가 있으면 코드를 우선한다.

## 1. 프로젝트 개요

- **정체**: 서울대학교 공식 수영부 웹사이트. 순수 정적 사이트 — 빌드 스텝 없음, `package.json` 없음, 프레임워크 없음(Vanilla HTML/CSS/JS, ES 모듈 1개).
- **스택**:
  - HTML: `index.html`이 실질적인 단일 페이지 앱(SPA). 섹션을 해시(`#about`, `#team` 등)로 전환하며, `js/main.js`의 `showPage()`가 `.content-section`에 `.is-current`를 토글하는 방식(라우터 라이브러리 없음).
  - CSS: `css/style.css` 1개 파일, 완전히 한 줄로 minify되어 있음(직접 grep으로 열람 시 `-o` 옵션 필요). 브레이크포인트는 `max-width:980px`, `max-width:760px`, `prefers-reduced-motion:reduce` 세 가지.
  - JS: `js/main.js`(약 1090줄, 렌더링·캐러셀·모달·인터랙션 전부)와 `js/i18n.js`(KR/EN 토글, 약 195줄). 둘 다 `<script type="module">`.
  - CMS: Sveltia CMS(`admin/`), GitHub 백엔드 + Cloudflare Workers OAuth 프록시 (§4 참고).
- **배포**: GitHub Pages. `CNAME` 파일에 `snuswimmingteam.org` 기록. GitHub Actions 워크플로 없음 — `main` 브랜치에 푸시하면 Pages가 그대로 서빙(별도 빌드 없이 저장소 루트가 곧 배포물).
- **repo**: `github.com/KIMCHEM-hub/snu-swimming-team`, 기본 브랜치 `main`. 커밋은 대부분 CMS를 통한 콘텐츠 업데이트("Update 팀 (TEAM > MEMBERS) "team"" 형식)와 코드 변경이 섞여 있음.
- **레거시/사용 안 함**: 루트의 `about.html`, `activities.html`, `gallery.html`, `join.html`, `training.html`은 옛 멀티페이지 버전의 잔재. 영문 placeholder(`[팀을 한 문장으로 소개]` 등)가 그대로 남아 있고 `index.html`의 어떤 내비게이션에서도 링크되지 않음. **삭제하기 전엔 사용자에게 먼저 확인** — 방치된 것인지 의도적으로 남겨둔 것인지 불명확.

## 2. 주요 기능별 구현 위치

| 기능 | 위치 |
|---|---|
| 섹션 라우팅(해시 기반 SPA) | `js/main.js:29-45` `showPage()`, `sectionIds` 배열 |
| KR/EN 언어 토글 | `js/i18n.js` 전체 (`initLang`, `setLang`, `t()`, `pick()`); `main.js`는 `langchange` 이벤트로 `renderAll()` 재실행(`main.js:1083-1086`) |
| 콘텐츠 로딩(JSON fetch) | `js/main.js:1015-1051` `fetchJson()` / `loadContent()` — `content/*.json` 11개 파일을 병렬 fetch, 캐시(`contentCache`) 후 `renderAll()` |
| SCHEDULE(시즌 아코디언 + 학교 로고 매칭) | `js/main.js:142-201`; 로고 매칭 규칙(`scheduleLogoRules`)은 콘텐츠가 아니라 표현 설정이라 JSON이 아닌 코드에 하드코딩 |
| RECORDS(종목별 탭 + 계영) | `js/main.js:203-256` |
| GALLERY(카테고리 필터 + srcset) | `js/main.js:258-307` |
| NEWS(홈 캐러셀 + NEWS 섹션 캐러셀 + READ MORE 모달) | `js/main.js:309-339`(렌더), `509-640`(홈 캐러셀), `755-891`(NEWS 캐러셀, 홈과 완전 별개 인스턴스), `642-753`(모달) |
| NOTICES(목록 + 상세 모달) | `js/main.js:341-385`(렌더), `893-965`(모달) |
| TRAINING(정기 훈련표 + GROUPS/STRUCTURE/DRYLAND) | `js/main.js:387-410`; GROUPS/STRUCTURE 문구는 철학적 내용이라 하드코딩, DRYLAND만 CMS 연동 |
| 이번 주 훈련 세션(화/목 카드) | `js/main.js:412-442`, 데이터 `content/weekly-training.json` |
| TEAM(LEADERSHIP/MEMBERS/LEGACY 3탭) | `js/main.js:449-504`; 세 컬렉션 중 하나가 비어있으면 해당 탭만 `content/team.json`의 `membersNote` 폴백 표시 |
| YouTube 뉴스 영상 자동정지 | `js/main.js:65-92` `initNewsVideoAutoStop()` — §5 참고 |
| 히어로 패럴랙스 | `js/main.js:94-140`, 데스크톱 전용, `prefers-reduced-motion` 존중 |
| 스크롤 리빌 애니메이션 | `js/main.js:967-1013` `setupRevealObservers()` |
| CMS 세션 존재 시 admin 링크 노출 | `js/main.js:50-63` (순수 표시용, 실제 접근 통제 아님) |
| 언어별 정적 텍스트(`data-i18n*`) | `js/i18n.js:130-143` `applyStaticTranslations()`, HTML에는 `data-i18n`/`data-i18n-html`/`data-i18n-attr` 속성으로 마킹 |
| 재렌더 시 리스너/타이머 중복 방지 | `js/main.js:1-13` `teardowns` 레지스트리 — 캐러셀/모달/옵저버 각각 `teardowns.push()`로 정리 함수 등록, `runTeardowns()`가 매 렌더 전 실행 |

## 3. `content/*.json` 스키마 요약

전체 스키마의 원본은 `admin/config.yml`(Sveltia CMS 필드 정의)이며, 여기 있는 어떤 요약도 그것과 어긋나면 `admin/config.yml`을 신뢰할 것. 공통 패턴: **다국어는 사이드카 필드**(`title` / `titleEn`) 방식 — `js/i18n.js`의 `pick(obj, field)`가 EN 모드일 때 `${field}En`이 비어있지 않으면 그것을, 아니면 한국어 원본을 반환. 이미지 필드는 파일명만 저장하고 `assetPath()`(`main.js:263-267`)가 `/assets/images/`, `./assets/images/`, 절대 URL 등을 정규화.

| 파일 | 최상위 키 | 내용 |
|---|---|---|
| `content/leadership.json` | `members[]` | 리더십(주장/부주장 등): role, name, koRole, koRoleEn?, photo? |
| `content/team.json` | `membersNote`, `membersNoteEn?`, `members[]` | 부원 명단(name, department?, year?, photo?) + 3탭 공용 폴백 문구 |
| `content/legacy.json` | `entries[]` | 레거시 스토리: name, body, bodyEn?, tag?(영문 캡션) |
| `content/training.json` | `schedule[]`, `dryland{}` | 정기 훈련 요일/시간/세션/장소, 드라이랜드 headline/caption |
| `content/schedule.json` | `events[]` | startDate, dateLabel, type(COMPETITION/JOINT TRAINING/EXCHANGE EVENT), title, result? |
| `content/records.json` | `entries[]` | event, athlete, time("24.43" 또는 "1:07.35"), tags[], meet, date, detail? |
| `content/relays.json` | `entries[]` | event, team, time, meet, date, members(참가 인원 텍스트) |
| `content/gallery.json` | `photos[]` | category(training/competition/team/events), label, title, meta, image, w?/sw?(축소본 srcset용) |
| `content/news.json` | `items[]` | startDate, dateLabel, category, title, image, alt, result?(있으면 홈 카드가 VIEW RESULTS 링크), body?(READ MORE 모달용) |
| `content/notices.json` | `items[]` | id(고정 식별자, 배열 인덱스 아님), date, title, author, body |
| `content/weekly-training.json` | `sessions[]` | date, day(화/목), totalDistance, details{warmup, mainset, events, cooldown} |

모든 텍스트 필드는 `*_En` 사이드카를 가질 수 있음(스키마 표에는 대표적인 것만 표기).

## 4. Sveltia CMS + Cloudflare Workers OAuth 구조

- **관리자 UI**: `admin/index.html` + `admin/config.yml`이 Sveltia CMS(Decap/Netlify CMS 호환 오픈소스 CMS, `/admin/`에서 정적으로 로드)를 구동.
- **백엔드**: `backend.name: github`, `repo: KIMCHEM-hub/snu-swimming-team`, `branch: main`. 즉 CMS에서 저장 시 GitHub API로 `main`에 직접 커밋(`publish_mode: simple` — 승인 워크플로 없이 즉시 반영. 필요해지면 `editorial_workflow`로 전환 가능하다고 config에 주석 있음).
- **OAuth**: `base_url: https://sveltia-cms-auth.chemi-kim1701.workers.dev` — Sveltia CMS 공식 권장 방식인 `sveltia-cms-auth` Cloudflare Worker(별도 저장소, 이 repo에는 코드 없음)가 GitHub OAuth 핸드셰이크를 대행. 사이트 자체엔 서버가 없으므로 GitHub `client_id`/`secret`을 다루는 유일한 컴포넌트가 이 Worker.
- **media_folder**: `assets/images`, `public_folder`: `/assets/images` — CMS로 업로드한 이미지는 루트 절대경로로 저장되므로 `assetPath()`의 정규화가 필요(§2).
- **관리자 링크 노출**: `js/main.js:50-63`은 `localStorage`에 `sveltia` 포함 키가 있으면 헤더의 admin 링크를 보여줌. 순수 UX 편의이며 보안 경계가 아님 — 실제 쓰기 권한은 GitHub repo 권한이 전담.

## 5. 진행 중 / 미해결 이슈

- **YouTube 자동정지 버그**: `52b1296`(커밋)에서 "NEWS 유튜브 영상이 화면을 벗어나도 계속 재생되는 버그"를 수정한 이력이 있음 — 현재 구현은 `js/main.js:65-92`, IntersectionObserver로 iframe이 뷰포트를 벗어나면 `postMessage({event:"command", func:"pauseVideo"})`를 보내고, `showPage()`(섹션 전환) 시에도 동일하게 pause 호출(`main.js:34`). **다만 이 postMessage는 YT 플레이어의 `onReady` 응답을 기다리지 않고 낙관적으로 전송**하며, iframe URL엔 `origin` 파라미터가 없음(`enablejsapi=1`만 있음) — 플레이어가 아직 준비되지 않았거나 postMessage 오리진 체크에 걸리는 특정 타이밍/브라우저 조합에서 pause가 조용히 무시될 가능성이 이론적으로 남아 있음. 재발 리포트가 오면 이 부분(iframe src의 `origin` 파라미터 추가, `onReady` 대기)부터 확인.
- 그 외 코드베이스 전체에 `TODO`/`FIXME` 마커는 없음(grep 확인). 열린 이슈 트래커나 이슈 파일도 repo 내에 없음 — 알려진 미해결 사항은 사용자가 직접 구두로 전달하는 것이 유일한 경로이므로, 새로 파악되면 이 섹션에 추가할 것.

## 6. 디자인 오버홀 방향과 제약사항

- **핵심 제약(반드시 지킬 것)**: 커밋 `eff42d5`, `8a2f35b` 등 최근 디자인 작업은 전부 **"구조·기능·CMS 불변, CSS/폰트만 수정"** 원칙 하에 진행됨. 구체적으로:
  - HTML 구조, 섹션 순서, DOM 마크업 변경 금지
  - `js/main.js` / `js/i18n.js`의 로직(캐러셀, 모달, 아코디언, 필터 등) 변경 금지
  - CMS 연동(`admin/config.yml`, `content/*.json` 스키마) 변경 금지
  - 콘텐츠 텍스트(카피) 변경 금지
  - **바꿔도 되는 범위**: `index.html` `<head>` 안의 인라인 `<style>` 블록(아래 §7 참고), Google Fonts `<link>`, 그리고 `css/style.css`.
- **작업 위치가 두 곳으로 나뉘어 있음에 주의**: CSS 변수(색상·폰트 토큰)는 `css/style.css`가 아니라 **`index.html:14`의 인라인 `<style>` 블록**에서 재정의되어 `css/style.css`의 구식 변수(`--sans`, `--navy` 등)를 오버라이드하는 구조. 색/폰트를 바꿀 땐 먼저 이 인라인 블록을 확인할 것 — `css/style.css`만 고치면 인라인 블록이 그대로 이겨서 반영 안 될 수 있음.
- **검증 관행**: 최근 디자인 커밋들은 Playwright로 여러 뷰포트(1440/768/500/375/320px) 스크린샷 비교 + computed style 확인 + 콘솔 에러 없음까지 확인 후 커밋하는 패턴을 따름(`8a2f35b`, `eff42d5` 커밋 메시지 참고). 동일 수준의 검증을 유지하는 것을 권장.
- **진행 이력(최신이 현재 상태)**:
  1. `eff42d5` — "AI 템플릿 인상 탈피, 대학 스포츠 프로그램다운 정체성" 목표로 전면 정비. `--font-display: Inter Tight → Anton`, `--font-athletic: Barlow Condensed → Oswald`, `--font-serif`(Noto Serif KR)·`--font-serif-latin`(PT Serif) 신규 도입, 색상 토큰에 `-deep` 명도 단계 추가, 갤러리/리더십 사진 hover 확대, 공지 모달 구분선에 레인로프 패턴(`repeating-linear-gradient`) 적용.
  2. `8a2f35b` — 히어로 텍스트 겹침 버그(Anton의 캡하이트가 커서 2줄 타이틀이 겹쳐 보임) 발견 후 `--font-display: Anton → League Gothic`으로 재교체, line-height/letter-spacing 조정. `--font-athletic`(Oswald)은 그대로 유지.
  - **결론: `Inter Tight`는 과거값이며 현재는 사용되지 않음.** 사용자가 "Inter Tight"를 언급했다면 이전 상태를 기억하고 있는 것일 수 있으니, 실제로 되돌리려는 의도인지 확인 필요.

## 7. CSS 변수 / 폰트 체계 (현재 상태, `index.html:14` 인라인 `<style>` 기준)

```css
:root{
  /* 컬러 — 서울대 브랜드 톤 */
  --snu-blue:#003380;       --snu-blue-deep:#001c47;
  --snu-gold:#C5A86F;       --snu-gold-deep:#8a6c30;
  --snu-beige:#EDE6D3;      --snu-gray:#666666;
  --snu-silver:#B5B6B6;     --snu-aqua:#6FB9D1;
  /* 구 변수명(css/style.css 하위 호환용 alias) */
  --navy:var(--snu-blue);   --blue:var(--snu-blue);
  --muted:var(--snu-gray);  --line:var(--snu-silver);
  --ink:#092a5a;             --ice:#f4f5f1;
  /* 폰트 */
  --font-ui:"Pretendard Variable","Pretendard","Noto Sans KR",Arial,sans-serif;
  --font-display:"League Gothic","Arial Narrow",Arial,sans-serif;   /* 히어로 H1, 섹션 H2 타이틀 전용 */
  --font-athletic:"Oswald","Arial Narrow",Arial,sans-serif;         /* 섹션 넘버/기록 뱃지/탭/상태 라벨 */
  --font-serif:"Noto Serif KR",Georgia,serif;                       /* ABOUT 리드/본문, TEAM LEGACY, 뉴스·공지 모달 본문 */
  --font-serif-latin:"PT Serif",Georgia,serif;                      /* legacy-pending 캡션 1곳(이탤릭) */
  --font-body:var(--font-ui);  --font-condensed:var(--font-athletic);
  --sans:var(--font-ui);       --display:var(--font-display);       /* css/style.css 하위 호환용 alias */
}
```

- **폰트 로딩**: Google Fonts(`League Gothic`, `Oswald:wght@500;700`, `PT Serif`, `Noto Serif KR:wght@400;600;700`)는 `index.html`의 `<link href="fonts.googleapis.com/css2?...">`로, **Pretendard Variable은 별도로 jsDelivr CDN**(`cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/...`)에서 로드. 둘 다 `index.html:8-11`.
- League Gothic은 Google Fonts에서 400(regular) 단일 굵기만 제공 — `font-weight:700/800`을 걸면 브라우저 합성 볼드가 걸려 획이 두꺼워지고 line-height 문제와 겹쳐 텍스트 겹침을 유발한 전례가 있음(§6의 `8a2f35b`). `--font-display` 관련 요소엔 `font-weight:400`을 유지할 것.
