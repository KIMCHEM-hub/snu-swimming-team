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
- **레거시 멀티페이지 정리(2026-08-14)**: 루트의 `about.html`, `activities.html`, `gallery.html`, `join.html`, `training.html`은 옛 멀티페이지 버전으로, 활성 SPA(`index.html`)나 부원/관리자 페이지에서 참조되지 않아 삭제했다. 현재 사이트의 페이지 전환은 `index.html`의 해시 기반 섹션 라우팅을 사용한다.

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
| 이번 주 훈련 세션(화/목 카드) | `js/main.js:412-442`, 데이터 Supabase `training_sessions`(2026-08-15부터 단일 소스; 과거엔 `content/weekly-training.json`과 병합했으나 제거됨) |
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
| `content/leadership.json` | `members[]` | 리더십(주장/부주장 등): role, name, koRole, koRoleEn?, photo?, memberId?(`content/team.json`의 `memberId`와 같은 패턴 — optional `public.members.id` 공개 미러, 없으면 이름 fallback) |
| `content/team.json` | `membersNote`, `membersNoteEn?`, `members[]` | 부원 명단(name, department?, year?, photo?, status?, memberId?) + 3탭 공용 폴백 문구. `memberId`는 `public.members.id` UUID의 optional 공개 미러 식별자이며, 없으면 기존 이름 fallback을 쓴다. `status`가 없으면 공개 표시는 active로 처리하며, 실제 기준은 `public.members.status`. |
| `content/legacy.json` | `entries[]` | 레거시 스토리: name, photo?, body, bodyEn?, tag?(영문 캡션) |
| `content/training.json` | `schedule[]`, `dryland{}` | 정기 훈련 요일/시간/세션/장소, 드라이랜드 headline/caption |
| `content/schedule.json` | `events[]` | startDate, dateLabel, type(COMPETITION/JOINT TRAINING/EXCHANGE EVENT), title, result? |
| `content/records.json` | `entries[]` | event, athlete, time("24.43" 또는 "1:07.35"), tags[], meet, date, detail? |
| `content/relays.json` | `entries[]` | event, team, time, meet, date, members(참가 인원 텍스트) |
| `content/gallery.json` | `photos[]` | category(training/competition/team/events), label, title, meta, image, w?/sw?(축소본 srcset용) |
| `content/news.json` | `items[]` | startDate, dateLabel, category, title, image, alt, result?(있으면 홈 카드가 VIEW RESULTS 링크), body?(READ MORE 모달용) |
| `content/notices.json` | `items[]` | id(고정 식별자, 배열 인덱스 아님), date, title, author, body |

모든 텍스트 필드는 `*_En` 사이드카를 가질 수 있음(스키마 표에는 대표적인 것만 표기).

## 4. Sveltia CMS + Cloudflare Workers OAuth 구조

- **관리자 UI**: `admin/index.html` + `admin/config.yml`이 Sveltia CMS(Decap/Netlify CMS 호환 오픈소스 CMS, `/admin/`에서 정적으로 로드)를 구동.
- **백엔드**: `backend.name: github`, `repo: KIMCHEM-hub/snu-swimming-team`, `branch: main`. 즉 CMS에서 저장 시 GitHub API로 `main`에 직접 커밋(`publish_mode: simple` — 승인 워크플로 없이 즉시 반영. 필요해지면 `editorial_workflow`로 전환 가능하다고 config에 주석 있음).
- **OAuth**: `base_url: https://sveltia-cms-auth.chemi-kim1701.workers.dev` — Sveltia CMS 공식 권장 방식인 `sveltia-cms-auth` Cloudflare Worker(별도 저장소, 이 repo에는 코드 없음)가 GitHub OAuth 핸드셰이크를 대행. 사이트 자체엔 서버가 없으므로 GitHub `client_id`/`secret`을 다루는 유일한 컴포넌트가 이 Worker.
- **media_folder**: `assets/images`, `public_folder`: `/assets/images` — CMS로 업로드한 이미지는 루트 절대경로로 저장되므로 `assetPath()`의 정규화가 필요(§2).
- **관리자 링크 노출**: `js/main.js:50-63`은 `localStorage`에 `sveltia` 포함 키가 있으면 헤더의 admin 링크를 보여줌. 순수 UX 편의이며 보안 경계가 아님 — 실제 쓰기 권한은 GitHub repo 권한이 전담.

## 5. 진행 중 / 미해결 이슈

- **YouTube 자동정지 버그**: `52b1296`에서 최초 수정, 이후 `4f41308`(2026-08-14)에서 신뢰성을 보강해 **해결됨**. 현재 구현(`js/main.js:65-` `initNewsVideoAutoStop()`)은 iframe src에 `origin` 쿼리 파라미터를 붙이고 postMessage 대상 오리진도 명시적으로 좁혔으며, YT 플레이어의 `onReady` 메시지를 기다렸다가 pause를 전송(대기 중 요청이 들어오면 최대 12회·250ms 간격 재시도 후 강제 전송)한다. 재발 리포트가 오면 이 재시도 타이밍/횟수부터 재검토할 것.
- **관리자 초대(`create_member_account`) 플로우 버그 — 해결됨, 실사용 재검증 완료(2026-08-15 발견 → 원인 규명 → 수정 → memberId E2E 재검증 과정에서 실제 초대로 재확인)**: 초대 메일 링크 클릭 시 Supabase가 자동 로그인 세션을 생성하지만, 실제로 테스트해보면 "초기 비밀번호 설정" 화면(`invitePasswordView`, §"Invite initial password setup" 참고)이 뜨지 않았다.
  - **증상 정리(조사 완료)**: 초대 링크 클릭 시 새 계정으로 세션 인증이 되지 않고, 브라우저에 기존에 로그인돼 있던 관리자(`chemi.kim1701@gmail.com`) 세션이 그대로 유지된 채 남았다. 이 상태에서 (새 계정으로 로그인했다고 착각하고) 프로필 수정요청을 제출하면, 실제로는 관리자 본인 세션으로 제출되어 `profile_edit_requests.member_id`에 관리자 자신의 member_id가 정확히 기록됨 — 별도의 "member_id mismatch" 버그가 아니라 이 초대 세션 인증 실패의 증상이었음을 확인(RLS INSERT policy와 `member_id` 컬럼 default 모두 정상 동작 확인됨, 데이터 오염 경로 아님).
  - **근본 원인(코드 조사로 확정)**: `worker/approve-request.js`의 `inviteAuthUser()`가 Supabase Admin API `POST /auth/v1/invite`를 호출할 때 `redirect_to`를 전혀 지정하지 않았다 — 반면 비밀번호 재설정(`resetPasswordForEmail()`, `js/members.js`)은 `redirectTo: members.html?auth=reset`을 명시 지정. GoTrue는 `redirect_to` 없이 호출되면 프로젝트의 Auth 대시보드 "Site URL" 설정으로 폴백하는데, 그동안 대시보드 작업 기록엔 "Redirect URLs" 허용목록에 `members.html`을 추가했다는 내용만 있고 Site URL 자체를 맞췄다는 기록이 없었음. Site URL이 루트(`index.html`)로 남아있었다면 초대 메일 링크가 애초에 `index.html`로 떨어지는데, 그 페이지는 자체 Supabase 클라이언트(`js/main.js`)는 있어도 `onAuthStateChange` 핸들러나 초대 UI가 전혀 없어 토큰이 조용히 무시되고, 그 사이 브라우저에 이미 남아있던 관리자 세션(localStorage 공유)이 그대로 유지되는 것으로 확인됨. (`showPage()`의 SPA 라우터가 해시를 오인해서 지운다는 최초 가설은 코드 검토 결과 근거 없음으로 기각 — `location.hash`/`history.*State`를 쓰는 세 곳 모두 읽기 전용.)
  - **적용한 수정**: (1) `worker/approve-request.js`의 `inviteAuthUser()` — `/auth/v1/invite` 요청 URL에 `?redirect_to=https://snuswimmingteam.org/members.html` 쿼리 파라미터 명시 추가(GoTrue는 `redirect_to`를 body가 아닌 쿼리 파라미터로 받음, `/recover`/`/signup`과 동일 컨벤션). (2) 안전망으로 `js/main.js` 최상단(`createClient()` 이전)에 `type=invite`/`type=recovery`가 해시나 쿼리스트링에서 감지되면 즉시 `./members.html`로 리다이렉트(해시·쿼리 원본 보존)하는 가드 추가 — Site URL 설정이 이후 다시 틀어져도 무해하게 처리됨. 로컬에서 `index.html#access_token=test&type=invite`/`type=recovery` 가짜 해시로 리다이렉트 동작 확인, `#team` 등 정상 섹션 해시는 리다이렉트 안 됨(오탐 없음) 확인, `node --check` 통과.
  - **실사용 재검증 완료**: 로컬 가짜 해시 테스트(안전망 ②만 검증) 이후, memberId E2E 재검증 과정에서 실제로 `kmcsfc0@naver.com`을 `create_member_account`로 초대한 케이스로 `redirect_to`(①)까지 포함해 실제 메일 발송 경로 전체가 정상 동작함을 확인함(아래 "memberId 우선 매칭 fix — E2E 재검증 완료" 참고).
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

## 8. 2026-08-14 작업 현황 및 다음 작업

### 완료

**기반 시스템(부원 페이지 전반)**
- 부원 로그인, 프로필(자기소개/SNS/프로필 사진 포함), 대회 실적, 정보 수정요청 → 관리자 승인 플로우를 구현했다. Supabase `members`/`profile_edit_requests` 테이블 + RLS, `worker/approve-request.js`(Cloudflare Worker, 이름 `snu-swim-approve-request`)가 private 필드는 `members` 테이블 직접 갱신, public 필드는 GitHub API로 `content/team.json` 자동 커밋을 담당한다. Worker 환경변수(`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`GITHUB_TOKEN`/`GITHUB_REPOSITORY`)는 Cloudflare 대시보드에서만 관리, 코드·리포에 저장하지 않는다.
- 프로필 사진 업로드: Supabase Storage 버킷 `profile-photos`(public read, `owner_id = auth.uid()` RLS)를 `supabase/profile-photos.sql`로 구성.
- 홈페이지 "THIS WEEK'S SESSIONS" 섹션, 구버전 멀티페이지 파일(`about.html` 등) 삭제, `CLAUDE.md` 보안 원칙 추가.

**role 3단계 + 출석 시스템 전면 구축**
- `members.role`을 `member`/`coach`/`admin` 3단계로 확장(`supabase/training-evaluations.sql`). RLS 재귀 방지용 `current_member_role()`/`is_coach()`/`is_admin()`/`coach_member_directory()` `SECURITY DEFINER` 함수 도입.
- 회원 상태는 `public.members.status`의 `active`/`OB`로 별도 관리한다(`supabase/member-status.sql`). 기존 회원은 `active`로 백필하며 role과 독립적이다. OB는 로그인·비밀번호 재설정·프로필·기존 이력 조회를 유지하지만, active 전용 신규 활동/평가와 코치 명단·월별 출석률에서는 제외된다. 관리자 전용 `admin_member_directory()`/`set_member_status()` RPC와 기존 승인 Worker가 상태 변경 및 `content/team.json` 공개 미러를 처리한다. Worker는 optional `memberId` UUID를 우선 사용하고 이름 fallback을 쓴다. TEAM 비대상은 DB 변경을 성공시키고 `public_mirror: "not_applicable"`을 반환하며, 실제 GitHub mirror 실패만 `"pending"`으로 반환한다.
- 훈련 평가를 점수(`score`) 방식에서 **출석 방식**으로 전환(`supabase/attendance-schema.sql`): `training_evaluations.attendance_type`(`출석`/`지각`/`인정결석`/`미인정결석`, 가중치 1.0/0.8/0.5/0으로 JS·SQL 양쪽에 CASE 문 정의). 신규 테이블 `self_reported_activities`(자유수영/4인모임 **자가기록** + `status` pending/approved/rejected **승인 플로우** — member는 본인 pending만 insert/select, 수정·삭제 불가, admin이 승인 처리). 월별 출석률은 뷰 대신 `monthly_attendance_rates()` `SECURITY DEFINER` 함수(RLS 우회 방지)로 계산 — coach/admin은 전체 부원, member는 본인만 조회, 분모는 그 달 전체 세션 수(누락 평가는 0점).
- UI: 코치 평가 입력 폼(출결 드롭다운), member "훈련 평가" 탭(이번 달 출석률 %, 50% 미만 경고 스타일 + 자가기록 제출/목록), 코치·관리자 공용 부원별 월별 출석률 목록, 관리자 자가기록 승인 대기 큐. 실제 부주장 계정으로 전체 플로우(평가입력 → 자가기록 제출 → 승인 → 재확인) 스모크 테스트 통과.

**팝업 공지 시스템**
- `popups` 테이블(`supabase/popups.sql`): `general`(전체 공지, 이미지 업로드 가능)과 `attendance_winner`(부원 지정형) 두 타입. 공개 조회는 `active_popups()` `SECURITY DEFINER` 함수로 `members` 테이블 직접 노출 없이 `member_name`만 반환. 홈페이지 팝업 표시는 X 닫기와 "오늘 하루 안 보기"(로컬스토리지, 날짜별 키) 둘 다 지원. 관리자 탭에 목록·생성·수정·활성토글·삭제 UI.

**YouTube 자동정지 신뢰성 보강**
- iframe src에 `origin` 파라미터 추가, `postMessage` 대상 오리진을 `"*"`에서 명시적 origin으로 좁힘, `onReady` 메시지를 기다린 뒤 pause 전송(대기 중이면 최대 12회 재시도). §5에 기록되어 있던 이론적 결함은 해결된 것으로 간주.

**코치 탭 서브탭 UI**
- 코치 패널의 "세션 관리"/"평가 입력"(이후 "출석률 현황" 추가로 3개) 뷰를 탭(`role=tablist`)으로 분리.

**TRAINING 세션 상세 뷰 전면 재구조화**
- 스키마(`supabase/session-details.sql` → `supabase/session-details-categories.sql` 순서 실행): `training_sessions.theme`(세션 전체 테마) 추가, 자식 테이블 `training_session_details`를 **WARM-UP/MAIN SET/EVENTS/COOL-DOWN 카테고리별**로 구성(`category` CHECK enum, `content` 텍스트, `distance` CHECK 표준값(25~1500), `sets` 0~10, `pace` `"xx'xx""` 정규식 CHECK). `training_sessions.warmup`/`mainset`/`events`/`cooldown` 컬럼은 스키마 변경 없이 "섹션별 짧은 테마" 용도로 의미만 재해석. RLS는 `training_sessions`와 동일한 소유권 모델(공개 read, 코치 본인 세션 CRUD, 관리자 전체) 재사용.
- 홈/TRAINING 카드는 요일·날짜·총거리·세션 테마 요약만 표시, `<button>` 클릭 시 공용 모달(`initSessionModal()`, `js/main.js`) 오픈. 모달은 카테고리별 아코디언 구조 — 섹션 테마는 즉시, 카테고리에 detail 행이 있을 때만 클릭/탭으로 펼쳐지는 표(거리·영법·내용·세트·페이스)를 세션 `id` 기준으로 Supabase에서 비동기 로드(레거시 `content/weekly-training.json` 항목은 `id`가 없어 펼침 UI 없이 테마만 표시). 데스크톱은 hover 배경색 변화 + 회전 화살표, 모바일(`max-width:760px`)은 항상 보이는 "탭하여 상세 보기" 힌트.
- 코치 세션 폼: WARM-UP/MAIN SET/EVENTS/COOL-DOWN 텍스트칸(이제 테마 용도) 유지 + 각 칸 아래 카테고리별 독립 세부사항 편집기(거리/영법/내용/세트수/페이스 드롭다운, 행 추가·삭제). 모든 드롭다운·입력창에 회색 placeholder(미선택 시 회색, 선택 후 일반색) 적용, 각 컨트롤 높이를 한 줄로 통일. 저장 시 4개 카테고리 행을 모아 검증 후 기존 detail 행 전부 삭제·재삽입.
- `node --check`, HTML 태그/CSS 중괄호 균형(다중 `<style>` 블록 합산), ko/en 사전 키 완전 동기화, `git diff --check`를 매 커밋마다 통과했다.

### 테스트 계정 참고

- 관리자: `chemi.kim1701@gmail.com`
- 테스트 부원: `kmcsfc0@naver.com`
- 실제 부주장: `ghftl136@snu.ac.kr`(현재 `coach` role) — 임의 비밀번호로 생성된 상태였으나, 현재 로그인 화면의 비밀번호 찾기 기능으로 본인이 재설정할 수 있다.
- 실제 일반 부원: `mjs0323@snu.ac.kr`

테스트 계정의 비밀번호나 토큰은 리포에 저장하지 않는다.

### 비밀번호 재설정 (2026-08-14)

- `members.html` 로그인 화면에 비밀번호 찾기, 이메일 요청, 새 비밀번호 설정 화면을 추가했고, `js/members.js`가 `supabase.auth.resetPasswordForEmail()`과 `updateUser({ password })`를 사용한다.
- 재설정 메일은 현재 정적 GitHub Pages 경로의 `members.html?auth=reset`으로 돌아온다. 복구 세션(`PASSWORD_RECOVERY`)에서만 비밀번호 변경 폼을 표시하고, 링크 오류·만료·변경 오류는 재요청 안내로 처리한다. 변경 성공 시 로그아웃 후 로그인 화면으로 이동한다.
- Supabase Dashboard의 Authentication > URL Configuration > Redirect URLs에 `https://snuswimmingteam.org/members.html?auth=reset`을 추가해야 한다. GitHub Pages 기본 도메인으로도 접속 또는 테스트한다면 `https://kimchem-hub.github.io/snu-swimming-team/members.html?auth=reset`도 추가한다.

### 로그인 세션 타이머 (2026-08-14)

- `js/members.js`는 로그인 성공 시 브라우저 로컬 저장소에 사용자별 10분 마감 시각을 저장한다. 사용자 활동은 이 시각을 변경하지 않으며, 마지막 2분에만 남은 시간과 로그인 연장 버튼을 보여준다.
- 로그인 연장은 버튼 클릭으로만 10분을 다시 시작한다. 마감 시 Supabase 로그아웃 후 로그인 화면으로 이동한다.
- 같은 브라우저의 여러 탭은 저장소 이벤트로 마감 시각·로그아웃을 맞춘다. 백그라운드 탭이 다시 표시될 때도 즉시 만료 여부를 확인한다.

### 공통 이미지 업로드 + Legacy 사진 (2026-08-14)

- `js/members.js`의 `uploadPublicImage()`가 프로필, 팝업, Legacy 사진의 MIME/확장자·5MB 검사, `profile-photos` bucket 업로드, public URL 생성을 공통 처리한다. 경로는 각각 `${currentMember.id}-${Date.now()}.${extension}`, `popup-${Date.now()}.${extension}`, `legacy-${Date.now()}.${extension}`이다.
- Legacy `photo`는 선택 필드다. `js/main.js`는 사진이 없거나 읽기에 실패하면 기존 `./assets/images/university-logo.png` fallback을 표시한다. `admin/config.yml`에도 같은 선택 사진 필드를 추가했다.
- 관리자 탭에서 Legacy 사진 변경 요청을 만들면 기존 `profile_edit_requests`의 public 요청으로 저장한다. `field_name`은 `legacy_photo`, `old_value`는 기존 Legacy 이름이며, `worker/approve-request.js`의 승인 흐름이 `content/legacy.json`을 갱신한다. bucket/RLS/SQL 변경은 없다.

### 2026-08-15 완료

**내비게이션 줄바꿈 버그 수정**
- 761~1150px 구간(태블릿 가로/축소된 브라우저 창 등)에서 헤더 메뉴 항목이 겹치거나 줄바꿈되던 버그를 수정. `css/style.css`만 변경 — 햄버거 메뉴 전환점을 760px에서 980px로 확장(기존 브레이크포인트 값 재사용, 새 breakpoint 없음), 기본(비-미디어쿼리) `.nav-menu`의 `gap:17px→11px`/`font-size:11px→9.5px` 축소, 760px 쿼리에 남아있던 중복 햄버거 규칙 제거. 로컬 서버 + iframe 4폭(390/850/994/1240px) 동시 렌더링으로 검증 후 커밋. 커밋 `963cf98`.

**memberId 우선 매칭 fix — E2E 재검증 완료 (2026-08-15)**
- `worker/approve-request.js`의 `updatePublicTeamMember()`가 `content/team.json` 매칭 시 이름 fallback 대신 `memberId`를 우선 사용하도록 수정, 커밋 `5414e92`로 배포 — 이 로직 자체는 여전히 유효하며 되돌리지 않았다.
- 최초 검증에 썼던 연결(TEAM 링크 기능으로 문지성 프로필을 테스트 부원 계정에 연결, `memberId: 270bd3c4-60eb-4b11-a361-78188e31c98d`, 커밋 `47cef3b`)은 그 테스트 계정(`mjs0323@snu.ac.kr`)이 6개 테스트/탈퇴 계정 정리 작업 중 삭제되며 무효화됐었으나(`content/team.json`의 고아 `memberId`는 커밋 `6e3fa73`으로 제거), **새 테스트 계정 `kmcsfc0@naver.com`으로 전체 E2E를 처음부터 재검증해 완료함**.
- 검증한 전체 플로우: 관리자 `create_member_account`로 계정 생성·초대 → 초대 메일로 초기 비밀번호 설정 → 로그인 → 프로필 수정요청 제출 → 관리자 승인. 전부 정상 작동 확인.
- 비공개 필드(`contact` 등, `updatePrivateMember()` 경로)는 TEAM 프로필 연결 여부와 무관하게 정상 승인됨을 확인.
- 공개 필드(`department` 등, `updatePublicTeamMember()` 경로)는 TEAM 프로필이 연결 안 된 계정에 대해 `HttpError(404, "Matching public team member was not found.")`로 정상 반려됨을 확인 — **버그가 아니라 설계된 동작**(TEAM 프로필 미연결 상태에서 공개 필드 승인은 애초에 성립할 수 없어야 함). 이 반려 경로는 `markReviewed()` 호출 전에 throw되므로 `profile_edit_requests.status`가 `pending`으로 안전하게 유지되는 것도 코드로 확인함.
- 부수 확인: 초대 링크 `redirect_to` 누락 버그 수정(§5 별도 항목에 기록)이 이번 실제 초대 케이스에서도 정상 동작함을 재확인 — 이전엔 로컬 가짜 해시로 안전망만 검증했었는데, 이번엔 실제 메일 발송 경로까지 확인 완료.
- 참고(추후 검토, 급하지 않음): `profile_edit_requests.reviewed_by` 컬럼이 `markReviewed()`에서 한 번도 채워지지 않아 항상 `null`로 남는 것을 발견 — 현재 관리자가 1명(`chemi.kim1701@gmail.com`)뿐이라 실질적 문제는 없으나, 관리자/코치 승인 권한이 여러 명으로 늘어나면 누가 승인했는지 추적할 수 있도록 `markReviewed()`에 `reviewed_by` 채우는 로직 추가를 검토할 것.

**TRAINING 세션 상세 모달 구분선 너비 버그 수정**
- 모바일(`max-width:760px`)에서 `.session-modal-sets-table`에 `display:block`을 직접 걸어 가로 스크롤을 만들던 방식이 원인이었음 — 자식 요소(`tr`/`td`)는 여전히 table-row/table-cell UA 기본값을 가지므로 브라우저가 별도 익명 테이블 박스를 만들어 실제 레이아웃을 그리는데, 이 박스는 바깥의 `width:100%`를 물려받지 않고 내용 크기로 좁게 렌더링되어 WARM-UP/MAIN SET 행과 구분선 폭이 안 맞았음. 스크롤 책임을 기존 wrapper `.session-modal-section-panel`(`overflow-x:auto`)로 옮기고 테이블은 기본 `display:table`을 유지하도록 수정. `index.html` 인라인 `<style>` 한 줄 교체, JS/HTML 구조 변경 없음. 커밋 `7a48d92`.

**TEAM 페이지 members active/OB 필터 UI**
- MEMBERS 탭 아래 재적부원/OB 서브필터 탭을 추가(기존 `team-tabs`와 동일한 `filter-bar` 마크업/클래스 재사용). `memberCardHtml`이 이미 읽던 `member.status`를 필터 조건으로 쓰고, 카드의 상태 라벨을 `team.statusActive`/`team.statusOB` i18n 키로 교체(기존엔 "active"가 영문 그대로 노출되던 버그성 표기였음). OB 카드는 골드 강조 없이 그레이스케일 사진·회색 라벨·축소 폰트로 구분(`index.html` 인라인 스타일). `activeTeamTab`/`memberStatusFilter`를 모듈 전역 변수로 둬서 언어 전환 재렌더에도 사용자가 보던 탭이 리셋되지 않게 함. `content/team.json` 26명 전원에 `"status": "active"` 반영, `admin/config.yml`에 select 위젯(재적부원/OB, 기본값 active) 추가. `feature/team-member-status-filter` 브랜치에서 작업 후 로컬 브라우저 검증(탭 전환, 빈 상태 폴백, OB 스타일) 거쳐 `main`에 머지.

**보안 감사 — 저장형 XSS 수정 완료**
- 전체 보안 감사(RLS 활성화 여부·SECURITY DEFINER 함수 권한, git 히스토리·클라이언트 코드 시크릿 하드코딩, Auth/세션 타임아웃, Worker CORS·에러 응답·rate limit, innerHTML 사용처·나누기 로직·maxlength·페이지네이션)를 수행. 유일한 심각(High) 발견은 저장형 XSS: `js/main.js`의 `memberCardHtml`/`leaderCardHtml`/`legacyEntryHtml`이 `bio`/`sns`/`department`/`photo`(회원 자가제출 정보 수정요청 → 관리자 승인 경로로 유입 가능) 등을 이스케이프 없이 `teamShell.innerHTML`에 직접 삽입했고, 기존 클라이언트 `sanitizeInput()`(`js/members.js`)은 `<`/`>` 제거뿐이라 `profile_edit_requests`에 정상 회원 RLS insert 권한으로 직접 삽입하면 우회 가능했음.
- 수정: `js/main.js`에 `escapeHtml()` 추가해 TEAM 카드 렌더링의 모든 보간 필드(name/role/department/year/bio/sns/photo src·alt/legacy body·tag/membersNote)에 적용 — 이것이 실제 렌더링 시점 XSS 경계. `worker/approve-request.js`에는 클라이언트와 동일한 로직의 서버측 `sanitizeInput()` 미러를 추가해 `getRequest()` 한 지점에서 `new_value`에 적용 — private/public 승인 경로 전부에 자동 적용되는 심층 방어. 두 함수의 역할은 명확히 분리됨(`sanitizeInput`=입력 제한/문자 제거, `escapeHtml`=렌더링 시 엔티티 치환 — 연산이 달라 이중 이스케이프 없음).
- 로컬에서 `<script>`/`<img onerror=...>` 페이로드를 부원 bio/sns/department에 임시 주입해 검증: 텍스트로만 표시, `#team` 내 `<script>` 요소 0개, `window.__xssFired` 미실행 확인 후 즉시 원복. `fix/team-card-xss-escape` 브랜치에서 작업 후 `main`에 머지(머지 커밋 `a3c860e`).
- 감사에서 나온 나머지 경미 항목 4건도 배치로 수정 완료(아래 참고) — **"보안 최종 감사" 항목은 완료로 닫혔다.**

**보안 감사 — 경미 항목 4건 배치 수정 완료**
- **Worker CORS 화이트리스트**: `worker/approve-request.js`·`worker/self-register.js`의 `Access-Control-Allow-Origin: "*"`를 프로덕션 도메인(`snuswimmingteam.org`) + GitHub Pages 폴백 도메인 + `localhost`/`127.0.0.1`(모든 포트, 로컬 개발용) 화이트리스트로 제한. 요청 Origin이 목록에 있을 때만 그대로 반영하고, 아니면 프로덕션 오리진으로 폴백(어차피 브라우저가 자신의 오리진과 다르면 응답을 못 읽으므로 사실상 차단과 동일) — 인증 경계가 아니라 브라우저 CORS 레벨 방어라는 점은 동일.
- **`requiredEnv()` 환경변수명 노출 제거**: `worker/approve-request.js`에서 env var가 없을 때 그 **이름**을 클라이언트 응답에 그대로 넣던 부분을 제거, 서버 로그(`console.error`)로만 남기고 클라이언트에는 일반 메시지만 반환. 다시 살펴보니 다른 에러 경로는 전부 이미 개발자가 직접 쓴 고정 문자열이었고 업스트림 원문은 애초에 로그로만 갔던 것이라, 진짜 노출 지점은 이거 하나였음. `createMemberAccount()`의 단계별 상태 메시지("Auth: invite sent; member: created (uuid)")는 CONTEXT.md에 이미 기록된 의도된 관리자 재시도 UX로 판단해 **의도적으로 손대지 않음** — self-register.js처럼 전면 코드화하면 `js/members.js`의 기존 설명형 메시지 소비 UI가 깨질 위험이 있었음.
- **self-register.js rate limit**: IP 기반(`CF-Connecting-IP`), 10분당 5회. `env.RATE_LIMIT_KV` 바인딩이 있으면 사용(Cloudflare 대시보드에서 KV 네임스페이스를 만들어 그 이름으로 바인딩해야 실제로 켜짐 — 이 변경만으로는 자동 생성되지 않음), 없으면 Worker isolate 범위의 in-memory Map으로 폴백(콜드 스타트 시 리셋, edge 전역 공유 아님 — best-effort). 새 에러 코드 `rate_limited`를 `js/i18n.js`의 `members.signupError.rate_limited`(KR/EN)에 매핑.
- **RECORDS/GALLERY/NOTICES 페이지네이션("더보기")**: RECORDS는 종목/계영 탭당 10행(숨긴 `<tr>`을 클릭 시 노출), GALLERY는 카테고리당 12개(필터 전환마다 재계산·재적용), NOTICES는 10개(기존 `createElement`/`textContent` 안전 패턴 유지). 전부 기존 `.button` 클래스를 재사용(`index.html`에 `.load-more-button` 위치 지정 1줄만 추가) — 각진 모서리·골드는 성과 강조 전용 원칙 그대로 유지.
- `fix/security-audit-minor-findings` 브랜치에서 작업, 로컬 브라우저 검증(CORS/rate-limit는 로직만 분리해 Node 단위 테스트, 페이지네이션은 임시로 부풀린 테스트 데이터로 3개 섹션 전부 확인 후 원복) 거쳐 `main`에 머지(머지 커밋 `4eb9ae0`).

**관리자 "NEW MEMBER ACCOUNT" 폼 성공 메시지 가시성 개선 완료**
- 조사 결과: 성공 메시지 자체는 항상 표시되고 있었지만(로직은 정상) ① 제출 버튼이 폼 맨 아래인데 메시지는 폼 맨 위(제목 바로 아래)에 떠서 스크롤 없인 안 보이기 쉬웠고 ② 자동 스크롤/포커스 이동이 전혀 없었고 ③ 성공/실패를 시각적으로 구분하는 스타일이 전혀 없어(둘 다 `.members-coach-status` 단일 스타일) 인지가 어려웠음.
- 조사 중 CSS 우선순위(specificity) 버그를 추가로 발견함: `.members-coach-status--success`처럼 단일 클래스 선택자로 추가한 색상 규칙이, 같은 자리에 이미 있던 `.members-panel p{color:#666}`(선택자 특이도가 한 단계 더 높음)에 항상 덮어써져 실제로는 회색으로만 렌더링되고 있었음 — 로컬 Chrome에서 `getComputedStyle`로 실측하다 발견. 같은 이유로 기존 `.members-coach-status{color:#8a6c30}`(골드)도 처음부터 한 번도 실제로 렌더링된 적이 없었을 가능성이 높음. `.members-coach-status.members-coach-status--success`처럼 베이스+수식자 클래스를 결합한 선택자로 특이도를 올려 해결.
- 수정: `js/members.js`의 `setAdminCreateMemberStatus(message, isError)`에 성공(`false`)/실패(`true`)/중립(`null`, 기본값) 3단계 인자를 추가해 `members-coach-status--success`/`--error` 클래스를 토글, 성공/실패 세팅 직후 `adminCreateMemberStatus.scrollIntoView({ behavior: "smooth", block: "center" })` 호출. `members.html`에 `.members-coach-status.members-coach-status--success{color:var(--snu-blue);font-weight:700}` / `.members-coach-status.members-coach-status--error{color:#b3261e}`(기존 거절 상태 색상 재사용) 추가 — 골드는 성과/승리 강조 전용 원칙을 지켜 성공 메시지에 쓰지 않음.
- 로컬 검증: 인증 없이 admin 패널 `hidden` 속성만 해제해 DOM 시뮬레이션. 성공 케이스 색상 `rgb(0,51,128)`(`--snu-blue`)·`font-weight:700`, 실패 케이스 `rgb(179,38,30)`, 중립(진행 중 메시지)은 기존과 동일한 `rgb(102,102,102)`로 무변화 확인. 페이지 하단(폼보다 한참 아래)까지 스크롤한 상태에서 트리거해도 `scrollIntoView`가 메시지를 뷰포트 정중앙으로 옮기는 것을 좌표로 확인. `node --check` 통과.

**HOME 디자인 리프레시 완료(2026-08-16)**
- 사전 조사(마크업/타이포/카드 여백·보더/브레이크포인트/골드 사용처 5개 항목) 결과를 바탕으로 5건 수정: ① `.schedule-access h2`의 캐스케이드에서 항상 지던 죽은 규칙 삭제 + `.current-grid h2`/`.home-news>div>h2`/`.home-join h2` line-height를 1.18로 통일(0.86 상속·0.9 등 제각각이던 값 정리 — 가장 많이 쓰이던 값 대신, League Gothic이 tall cap-height 때문에 과거 히어로 겹침 버그(`8a2f35b`)를 낸 전례를 고려해 사람이 이미 명시적으로 골랐던 안전한 값을 채택) ② `.current-grid`/`.home-news-grid article`의 2px 상단 보더 색을 `--ink`→`--snu-blue`로 통일(`.weekly-session`과 일치) ③ 섹션 패딩을 48/64/80px 3단 스케일로 정리(`.home-news` 90→80px, `.home-join` 54→48px, 나머지 4곳은 이미 부합해 무변경) ④ `.weekly-training-title` 골드→`--snu-blue`(성과·승리와 무관한 단순 섹션 라벨이었음) ⑤ `.home-join .eyebrow` 골드→`#d8dce3`(네이비 배경 대비 목적은 유지, 성과 색과 분리).
- 반응형 브레이크포인트 통일은 범위가 커서 이번엔 손대지 않고 별도 항목으로 기록만(§ "다듬을 디테일 후보" 참고).
- 검증: 로컬 서버 + iframe 3폭(360/768/1440px) 전체 스크롤로 레이아웃 깨짐 없음과 색상 변경 5건 중 육안 확인 가능한 2건(④⑤)을 직접 확인. `git diff --check` 통과, `index.html` 중괄호 균형 확인. HTML 구조·JS 로직 변경 없음, `index.html` 인라인 `<style>`만 수정.

**TEAM 디자인 리프레시 완료(2026-08-16)**
- 사전 조사 결과 HOME과 다른 지점 2건 확인 후 수정: ① 두 줄 헤딩("MEET THE TEAM.")인데 line-height가 전역 h2 기본값(0.86)을 상속 중이던 것을 HOME과 동일한 이유(League Gothic tall cap-height, 과거 겹침 버그 `8a2f35b`)로 1.18로 통일. ② `.filter-bar button.is-active,.record-tabs button.is-active{border-color:var(--snu-gold)}` — LEADERSHIP/MEMBERS/LEGACY 탭과 재적부원/OB 서브필터, RECORDS 종목 탭의 "선택됨" 밑줄이 골드였던 것을 `var(--snu-blue)`로 변경(성과/승리 전용 원칙 위반이었음, 텍스트색은 원래도 네이비라 무변경). 카드 상단 보더(`--snu-blue`, 이미 일치)와 카드 자체의 골드 미사용은 조사 결과 이미 원칙에 맞아 손대지 않음.
- **구현 중 발견 및 재타겟팅**: 처음엔 `#team-title` 선택자로 line-height를 넣으려 했으나, 실제 런타임에는 `js/main.js`의 `renderTeam()`이 `#team .shell` 내부를 매번 새로 그리며 그 템플릿의 `<h2>`엔 `id` 속성이 없다는 걸 확인함(`id="team-title"`은 JS 실행 전 정적 HTML에만 존재하는 죽은 참조). `#team .section-head h2{line-height:1.18}`로 스코프를 바꿔 실제 렌더링 요소에 적용되도록 재타겟팅.
- 탭 밑줄 색 규칙은 `.filter-bar`뿐 아니라 `.record-tabs`도 공유하므로 RECORDS 종목 탭까지 함께 바뀜을 인지하고 양쪽 다 육안 확인함(아래 검증 참고). `GR`/`GOLD`/`SILVER`/`BRONZE` 기록 뱃지(`.record-badge`/`.result-tag`)는 별도 규칙이라 골드 그대로 유지 — 실제 성과 표시라 원칙에 맞음.
- **별도 미해결로 남긴 발견**: `.event-tabs button.is-active{color:var(--snu-blue);border-color:var(--snu-gold)}`(SCHEDULE 페이지 시즌/종목 탭)도 동일한 골드 밑줄 패턴을 씀 — 이번 승인 범위(`.filter-bar`/`.record-tabs`)엔 없어서 미수정. SCHEDULE 페이지 리프레시 시 함께 판단할 것.
- 검증: 로컬 서버 + iframe 3폭(360/768/1440px), TEAM은 LEADERSHIP→MEMBERS→재적/OB→LEGACY 탭을 실제 클릭 전환하며 밑줄이 전부 네이비로 뜨는지, 두 줄 헤딩 겹침이 없는지 확인. RECORDS는 종목 탭 밑줄이 네이비로 회귀 없이 바뀌었는지, 기록 뱃지 골드가 그대로인지 확인. `git diff --check` 통과. HTML 구조·JS 로직 변경 없음, `index.html` 인라인 `<style>`만 수정.

### 다음 작업 (우선순위 순, 2026-08-15 갱신)

1. 비주얼 디자인을 개편한다 — **각진 모서리를 유지**하고, **골드 색상은 성과/승리 순간에만** 사용하는 방향으로. §6/§7의 기존 디자인 원칙·이력을 먼저 참고할 것. + 개편 후 Android/iOS/PC 크로스 디바이스 반응형 최종 점검.
2. 월간 자동화 Worker(`attendance_winner` 팝업 자동 생성, cron) — 필수는 아니며 위 항목들 완료 후 여유 있을 때 진행.

## 디자인 리프레시 방향 (다음 세션 시작 시 참고)

> 아래는 방향 메모일 뿐 아직 실행되지 않았다 — 다음 세션이 항목 1(비주얼 디자인 개편)을 시작할 때의 기준점으로 기록해 둔다.

- **성격**: 전면 재설계 아님. 기존 디자인 언어(각진 모서리, 골드는 성과/승리 순간 전용, 네이비가 배경/구조 위계 담당) 유지하며 디테일만 다듬는 리프레시.
- **범위**: 사이트 전체, 순차적으로 진행(한 번에 전부 X, 페이지/섹션 단위).
- **진행 순서 후보**(2026-08-15 갱신 — "좁은 뷰포트에서 nav 줄바꿈" 항목 제거: `963cf98` 커밋으로 이미 해결 완료된 사항(§8 기록)이며, 320px~1440px 전구간 iframe 재검증 결과 문제 재현 안 됨을 확인해 이 메모가 갱신 안 된 stale 항목이었음이 드러남):
  1. ~~HOME~~ — **완료(2026-08-16, 상세는 §8 참고)**
  2. ~~TEAM~~ — **완료(2026-08-16, 상세는 §8 참고 — `.event-tabs`(SCHEDULE) 골드 밑줄은 별도 미해결로 남김)**
  3. **RECORDS/GALLERY/NOTICES(다음 작업 — 페이지네이션이 최근 추가된 곳들)**
  4. 멤버 대시보드(로그인 후 화면)
- **다듬을 디테일 후보**:
  - 타이포 크기/줄간격 일관성(Pretendard/League Gothic/세리프 조합, 페이지 간 통일 여부 확인 필요)
  - 카드/버튼 여백, 보더 두께 일관성
  - 반응형 브레이크포인트 통일(2026-08-16 HOME 조사로 구체화: nav는 `css/style.css`의 `@media(max-width:980px)`에서 햄버거로 전환되는데, HOME 콘텐츠(hero/current-panel/home-news/quick-facts/home-join/home-contact)는 전부 `max-width:760px` 하나만 쓰고 981~760px 구간에서 데스크톱 레이아웃을 유지 — 두 시스템이 서로 다른 기준. HOME 자체 리프레시(2026-08-16, 타이포/보더/패딩/골드 5건)에서는 범위가 커서 일부러 손대지 않았고, 전체 사이트 반응형 QA 단계에서 nav·콘텐츠 브레이크포인트를 한 번에 통일 검토할 것)
- **반응형 QA 기준 구간**: 모바일(360~430px) / 태블릿(768px) / 데스크톱

- **폰트 로딩**: Google Fonts(`League Gothic`, `Oswald:wght@500;700`, `PT Serif`, `Noto Serif KR:wght@400;600;700`)는 `index.html`의 `<link href="fonts.googleapis.com/css2?...">`로, **Pretendard Variable은 별도로 jsDelivr CDN**(`cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/...`)에서 로드. 둘 다 `index.html:8-11`.
- League Gothic은 Google Fonts에서 400(regular) 단일 굵기만 제공 — `font-weight:700/800`을 걸면 브라우저 합성 볼드가 걸려 획이 두꺼워지고 line-height 문제와 겹쳐 텍스트 겹침을 유발한 전례가 있음(§6의 `8a2f35b`). `--font-display` 관련 요소엔 `font-weight:400`을 유지할 것.
## Member account invite and TEAM link (2026-08-15)

- Admins create member accounts only through the existing `snu-swim-approve-request` Worker action `create_member_account`. The browser sends a Supabase session token only; the Worker keeps the service-role key and calls Supabase Auth `/invite`, so no temporary password is generated or exposed.
- The Worker uses email as the Auth-to-`public.members` connection. It creates (or safely reuses on retry) an active `members` row with email, name, and role. Existing data that differs from a retry returns a conflict instead of being overwritten.
- TEAM linking is optional. The admin UI lists only unlinked profiles and submits the selected array index plus an exact JSON snapshot. The Worker verifies that the selected entry is unchanged, then writes `memberId = public.members.id`. It never finds a TEAM profile by name in this new flow. If the GitHub TEAM commit fails, the response names the successfully completed Auth/member stages and returns the member ID for retry.
- Supabase Dashboard must have Auth email delivery enabled and an Invite redirect URL configured for `https://snuswimmingteam.org/members.html` (and the production site URL added to Auth URL Configuration). The invite email then lets the recipient set their own password.
## Invite initial password setup (2026-08-15)

- `members.html` has a dedicated initial-password view for Supabase invite users. `js/members.js` captures a `type=invite` callback from the query string or hash before Supabase processes it, then waits for the resulting session.
- The callback is converted to a sessionStorage marker keyed by the signed-in user ID and the callback URL is replaced with `./members.html`; tokens and callback parameters do not remain in the address bar. The marker keeps the setup view on refresh and is removed only after a successful `supabase.auth.updateUser({ password })` call.
- Invite password validation uses the existing reset password mismatch/error messages and updateUser pattern. Success opens the normal member dashboard without signing the user out. Existing password-reset and normal-login paths stay separate.

## Whitelist self-signup (2026-08-15, complete — E2E verified)

- New self-service signup path alongside (not replacing) `create_member_account`: an admin bulk-registers `email,name` pairs in advance, and a prospective member sets their own password on `members.html` — but only if their entered email **and** name exactly match one unused whitelist row.
- `supabase/invited-members.sql` (new `public.invited_members` table + RLS, admin-only via `is_admin()`, no anon/authenticated-member policy at all) has been run in the Supabase SQL Editor, and `worker/self-register.js` is deployed as its own Cloudflare Worker at `https://snu-swim-self-register.chemi-kim1701.workers.dev` (chosen over extending `snu-swim-approve-request.js`, whose `fetch()` gates every action behind `verifyAdmin()` at the top — a public/unauthenticated signup route doesn't fit that gate without weakening it). `js/members.js`'s `SELF_REGISTER_WORKER_URL` matches the deployed URL.
- Supabase public Auth sign-up stays **disabled**, unchanged from the existing pre-registration-only posture. The Worker validates the whitelist match first, then creates the Auth user itself via the Admin API (`POST /auth/v1/admin/users`, service-role key, same privilege level `create_member_account` already uses for `/invite`) — the client never calls `supabase.auth.signUp()`.
- Validation is entirely server-side in the Worker (CLAUDE.md §7 principle applied to a public-facing action, not just admin-gated ones): it atomically claims the whitelist row (`PATCH ...&used=eq.false`, single UPDATE statement) before creating anything, and rolls the claim back if Auth-user creation fails afterward. A mismatched email or name gets the identical generic error either way, so the endpoint can't be used to enumerate whitelist emails; once email+name are confirmed to match, later-stage errors (already used, account already exists) are specific and safe to show.
- `js/members.js` maps the Worker's fixed error *codes* (`no_match`, `already_registered`, `account_exists`, `claim_conflict`, `weak_password`, `invalid_input`, `server_error`) to localized KR/EN strings via new `members.signupError.*` i18n keys — the Worker itself never sends free-text error detail to this unauthenticated caller, unlike `create_member_account`'s admin-facing responses.
- TEAM/`memberId` linking is intentionally **not** automatic at signup (same caution as the existing memberId history in this file — no automatic name-matching to TEAM profiles). No new admin feature was needed for this: `createMemberAccount`'s existing reuse path (matching email/name/role hits its `assertExistingMemberMatches` branch instead of creating a new row) already lets an admin link a TEAM profile to a self-registered account by resubmitting the same email/name/role through the existing "NEW MEMBER ACCOUNT" admin form.
- Admin UI addition: a "INVITE WHITELIST" section (English-only, matching the existing untranslated admin-account/member-status sections) under the admin tab — a textarea for pasting `email,name` lines (bulk insert directly via the authenticated admin's own Supabase session, RLS-gated, no Worker involved) plus a list of existing entries with OPEN/USED status and a delete button.
- **E2E verified (2026-08-15)**: both the happy path (whitelisted email + exact name → account created → auto sign-in) and the rejection path (name mismatch → generic error, whitelist row stays unclaimed) were tested and passed. Test accounts created during this verification were cleaned up afterward (Supabase Auth + `public.members` + any leftover `invited_members` rows). Merged to `main` via `feature/whitelist-self-signup` (commit `e606380`, merge `bac430d`); that branch has since been deleted (local + remote).
- Rate limiting for this public Worker route was later added; see "보안 감사 — 경미 항목 4건 배치 수정 완료" below.

## Email delivery + admin invite check (2026-08-15)

- Resend is now connected as the Supabase Auth SMTP provider, with the sending domain verified. This is what makes both `worker/self-register.js`'s Admin API account creation (`email_confirm: true`, no email actually required to complete signup, but the project's Auth email settings now route through Resend regardless) and the existing invite email flow deliverable — previously outbound Auth email depended on Supabase's default/shared sender.
- Re-confirmed the existing admin `create_member_account` flow (`snu-swim-approve-request` Worker, invite-based) still works normally after the SMTP change — the two account-creation paths (admin invite vs. whitelist self-signup) do not interfere with each other.

## leadership.json memberId (2026-08-15)

- `content/leadership.json` entries now support an optional `memberId` field (same pattern as `content/team.json`'s existing `memberId` — an optional public mirror of `public.members.id`, name fallback if absent). The team captain's leadership entry has been linked to their member account via this field.
