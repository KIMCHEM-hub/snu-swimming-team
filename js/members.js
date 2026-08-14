import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const loginView = document.querySelector("[data-login-view]");
const profileView = document.querySelector("[data-profile-view]");
const loginForm = document.querySelector("[data-login-form]");
const logoutButton = document.querySelector("[data-logout-button]");
const status = document.querySelector("[data-auth-status]");
const emailEl = document.querySelector("[data-member-email]");
const nameEl = document.querySelector("[data-member-name]");
const athleteIdEl = document.querySelector("[data-member-athlete-id]");

function setStatus(message = "") {
  status.textContent = message;
  status.hidden = !message;
}

function showLogin(message = "") {
  loginView.hidden = false;
  profileView.hidden = true;
  setStatus(message);
}

async function showProfile(user) {
  loginView.hidden = true;
  profileView.hidden = false;
  emailEl.textContent = user.email || "";
  nameEl.textContent = "불러오는 중…";
  athleteIdEl.textContent = "불러오는 중…";
  setStatus();

  const { data: member, error } = await supabase
    .from("members")
    .select("name, athlete_id")
    .eq("email", user.email)
    .maybeSingle();

  if (error) {
    nameEl.textContent = "—";
    athleteIdEl.textContent = "—";
    setStatus("부원 정보를 불러오지 못했습니다. 관리자에게 문의해 주세요.");
    return;
  }
  if (!member) {
    nameEl.textContent = "등록 정보 없음";
    athleteIdEl.textContent = "—";
    setStatus("로그인 이메일과 일치하는 부원 정보를 찾지 못했습니다.");
    return;
  }
  nameEl.textContent = member.name || "—";
  athleteIdEl.textContent = member.athlete_id || "—";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const submitButton = loginForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setStatus();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email"),
    password: formData.get("password")
  });
  submitButton.disabled = false;
  if (error) setStatus("이메일 또는 비밀번호를 확인해 주세요.");
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  logoutButton.disabled = false;
  if (error) setStatus("로그아웃하지 못했습니다. 다시 시도해 주세요.");
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) showProfile(session.user);
  else showLogin();
});

const { data: { session } } = await supabase.auth.getSession();
if (session?.user) showProfile(session.user);
else showLogin();
