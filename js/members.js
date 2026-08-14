import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { applyStaticTranslations, initLang, pick, t } from "./i18n.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const loginView = document.querySelector("[data-login-view]");
const dashboardView = document.querySelector("[data-profile-view]");
const loginForm = document.querySelector("[data-login-form]");
const logoutButton = document.querySelector("[data-logout-button]");
const status = document.querySelector("[data-auth-status]");
const emailEl = document.querySelector("[data-member-email]");
const nameEl = document.querySelector("[data-member-name]");
const studentIdEl = document.querySelector("[data-member-student-id]");
const contactEl = document.querySelector("[data-member-contact]");
const bioRow = document.querySelector("[data-member-bio-row]");
const bioEl = document.querySelector("[data-member-bio]");
const snsRow = document.querySelector("[data-member-sns-row]");
const snsEl = document.querySelector("[data-member-sns]");
const tabs = document.querySelectorAll("[data-member-tab]");
const panels = document.querySelectorAll("[data-member-panel]");
const recordsEl = document.querySelector("[data-member-records]");
let currentUser = null;
let currentMember = null;
let statusKey = "";

function setStatus(key = "") {
  statusKey = key;
  status.textContent = statusKey ? t(statusKey) : "";
  status.hidden = !statusKey;
}

function selectTab(tabName) {
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.memberTab === tabName));
  panels.forEach((panel) => { panel.hidden = panel.dataset.memberPanel !== tabName; });
}

function showLogin(messageKey = "") {
  currentMember = null;
  loginView.hidden = false;
  dashboardView.hidden = true;
  selectTab("profile");
  setStatus(messageKey);
}

function renderRecords(records) {
  if (!records.length) {
    recordsEl.innerHTML = `<p class="members-records-empty">${t("members.noRecords")}</p>`;
    return;
  }
  const rows = records.map((record) => `<tr><td>${pick(record, "event")}</td><td>${record.time}</td><td>${pick(record, "meet")}${pick(record, "detail") ? ` · ${pick(record, "detail")}` : ""}</td><td>${record.date}</td></tr>`).join("");
  recordsEl.innerHTML = `<table class="members-records"><thead><tr><th>${t("members.recordEvent")}</th><th>${t("members.recordTime")}</th><th>${t("members.recordMeet")}</th><th>${t("members.recordDate")}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function loadRecords(member) {
  recordsEl.innerHTML = `<p class="members-records-empty">${t("members.loading")}</p>`;
  try {
    const response = await fetch("./content/records.json");
    if (!response.ok) throw new Error("Could not load records.");
    const { entries = [] } = await response.json();
    renderRecords(entries.filter((record) => record.athlete === member.name));
  } catch (error) {
    recordsEl.innerHTML = `<p class="members-records-empty">${t("members.profileLoadError")}</p>`;
  }
}

async function loadTeamProfile(member) {
  bioRow.hidden = true;
  snsRow.hidden = true;
  try {
    const response = await fetch("./content/team.json");
    if (!response.ok) throw new Error("Could not load team profile.");
    const { members = [] } = await response.json();
    const teamMember = members.find((entry) => entry.name === member.name);
    if (!teamMember) return;
    const bio = pick(teamMember, "bio");
    const sns = pick(teamMember, "sns");
    if (bio) {
      bioEl.textContent = bio;
      bioRow.hidden = false;
    }
    if (sns) {
      snsEl.textContent = sns;
      snsRow.hidden = false;
    }
  } catch (error) {
    // Optional team-profile fields do not prevent access to the core profile.
  }
}

async function showDashboard(user) {
  loginView.hidden = true;
  dashboardView.hidden = false;
  selectTab("profile");
  emailEl.textContent = user.email || "";
  nameEl.textContent = t("members.loading");
  studentIdEl.textContent = t("members.loading");
  contactEl.textContent = t("members.loading");
  bioRow.hidden = true;
  snsRow.hidden = true;
  setStatus();

  const { data: member, error } = await supabase
    .from("members")
    .select("name, student_id, contact")
    .eq("email", user.email)
    .maybeSingle();

  if (error) {
    nameEl.textContent = "—";
    studentIdEl.textContent = "—";
    contactEl.textContent = "—";
    setStatus("members.profileLoadError");
    return;
  }
  if (!member) {
    nameEl.textContent = t("members.noProfileName");
    studentIdEl.textContent = "—";
    contactEl.textContent = "—";
    setStatus("members.noProfile");
    return;
  }
  currentMember = member;
  nameEl.textContent = member.name || "—";
  studentIdEl.textContent = member.student_id || "—";
  contactEl.textContent = member.contact || "—";
  await Promise.all([loadRecords(member), loadTeamProfile(member)]);
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  if (currentUser) await showDashboard(currentUser);
  else showLogin();
}

tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.memberTab)));

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
  if (error) setStatus("members.invalidCredentials");
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  if (error) {
    logoutButton.disabled = false;
    setStatus("members.logoutError");
    return;
  }
  window.location.replace("./index.html");
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  if (currentUser) showDashboard(currentUser);
  else showLogin();
});

initLang();
applyStaticTranslations();
window.addEventListener("langchange", () => {
  applyStaticTranslations();
  setStatus(statusKey);
  if (currentMember) loadRecords(currentMember);
});
window.addEventListener("pageshow", checkSession);

await checkSession();
