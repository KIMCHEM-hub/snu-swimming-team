# 보안 절대 원칙 (모든 세션에서 반드시 준수)

1. `.env`, API 키, 토큰, `service_role` key를 절대 코드에 하드코딩하지 않는다.
2. Supabase `service_role` key는 서버/Worker 환경변수로만 관리하며, 클라이언트 코드나 리포에 절대 노출하지 않는다. `anon`/publishable key만 클라이언트에서 사용 가능하다.
3. 새 Supabase 테이블 생성 시 반드시 RLS(Row Level Security)를 함께 설정하고, 정책 없이 테이블을 방치하지 않는다.
4. RLS 정책 작성 시 같은 테이블을 정책 내부에서 재조회하는 재귀 패턴을 피하고, 필요시 `SECURITY DEFINER` 함수로 우회한다.
5. 커밋 전 항상 `git status`로 `.env`, 시크릿 관련 파일이 포함되지 않았는지 확인한다.
6. 사용자 입력값은 항상 `textContent` 등 안전한 방식으로 렌더링하고, `innerHTML`에 직접 삽입하지 않는다(XSS 방지).
7. 관리자 전용 기능은 반드시 DB 레벨(RLS)에서 권한을 강제하며, 프론트엔드 UI 숨김만으로 권한을 제어하지 않는다.
