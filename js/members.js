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
const pendingRequests = document.querySelector("[data-pending-requests]");
const pendingRequestList = document.querySelector("[data-pending-request-list]");
const pendingRequestBlock = document.querySelector("[data-pending-request-block]");
const requestModal = document.querySelector("[data-edit-request-modal]");
const requestForm = document.querySelector("[data-edit-request-form]");
const requestStatus = document.querySelector("[data-edit-request-status]");
const requestOpenButton = document.querySelector("[data-edit-request-open]");
const requestCloseButtons = document.querySelectorAll("[data-edit-request-close]");
const tabs = document.querySelectorAll("[data-member-tab]");
const panels = document.querySelectorAll("[data-member-panel]");
const recordsEl = document.querySelector("[data-member-records]");
const adminTab = document.querySelector("[data-admin-tab]");
const adminPanel = document.querySelector('[data-member-panel="admin"]');
const adminStatus = document.querySelector("[data-admin-status]");
const adminRequestList = document.querySelector("[data-admin-request-list]");
const APPROVE_REQUEST_WORKER_URL = "https://snu-swim-approve-request.chemi-kim1701.workers.dev";
let currentUser = null;
let currentMember = null;
let currentTeamMember = null;
let statusKey = "";
let pendingRequestCount = 0;

function setStatus(key = "") {
  statusKey = key;
  status.textContent = statusKey ? t(statusKey) : "";
  status.hidden = !statusKey;
}

function selectTab(tabName) {
  if (tabName === "admin" && currentMember?.role !== "admin") return;
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.memberTab === tabName));
  panels.forEach((panel) => { panel.hidden = panel.dataset.memberPanel !== tabName; });
  if (tabName === "admin") loadAdminRequests();
}

function setRequestStatus(key = "") {
  requestStatus.textContent = key ? t(key) : "";
  requestStatus.hidden = !key;
}

function sanitizeInput(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/[<>]/g, "")
    .trim();
}

function openRequestModal() {
  if (!currentUser || !currentMember) return;
  if (pendingRequestCount > 0) {
    pendingRequestBlock.hidden = false;
    return;
  }
  requestForm.reset();
  setRequestStatus();
  requestModal.hidden = false;
}

function closeRequestModal() {
  requestModal.hidden = true;
  setRequestStatus();
}

function formatRequestDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en-US" : "ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function renderPendingRequests(requests) {
  pendingRequestCount = requests.length;
  pendingRequestList.replaceChildren();
  pendingRequests.hidden = !requests.length;
  pendingRequestBlock.hidden = !requests.length;
  requests.forEach((request) => {
    const item = document.createElement("li");
    const label = t(`members.requestField.${request.field_name}`);
    item.textContent = `${label} (${formatRequestDate(request.created_at)})`;
    pendingRequestList.append(item);
  });
}

async function loadPendingRequests() {
  if (!currentUser) return;
  const { data, error } = await supabase
    .from("profile_edit_requests")
    .select("field_name, created_at")
    .eq("member_id", currentUser.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (!error) renderPendingRequests(data || []);
}

function setAdminStatus(message = "") {
  adminStatus.textContent = message;
  adminStatus.hidden = !message;
}

function requestMemberName(request) {
  const relation = Array.isArray(request.members) ? request.members[0] : request.members;
  return relation?.name || "—";
}

function appendAdminDetail(details, label, value) {
  const group = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value || "—";
  group.append(term, description);
  details.append(group);
}

function renderAdminRequests(requests) {
  adminRequestList.replaceChildren();
  if (!requests.length) {
    const empty = document.createElement("p");
    empty.className = "members-records-empty";
    empty.textContent = t("members.adminEmpty");
    adminRequestList.append(empty);
    return;
  }

  requests.forEach((request) => {
    const card = document.createElement("article");
    card.className = "members-admin-request";
    card.dataset.adminRequestId = request.id;

    const head = document.createElement("div");
    head.className = "members-admin-request-head";
    const requester = document.createElement("p");
    requester.className = "members-admin-requester";
    requester.textContent = `${t("members.adminRequester")}: ${requestMemberName(request)}`;
    const date = document.createElement("time");
    date.className = "members-admin-date";
    date.textContent = formatRequestDate(request.created_at);
    head.append(requester, date);

    const details = document.createElement("dl");
    details.className = "members-admin-detail";
    appendAdminDetail(details, t("members.adminField"), t(`members.requestField.${request.field_name}`));
    appendAdminDetail(details, t("members.adminChange"), `${request.old_value || "—"} → ${request.new_value || "—"}`);
    appendAdminDetail(details, t("members.adminTargetType"), request.target_type === "public" ? t("members.adminPublic") : t("members.adminPrivate"));

    const actions = document.createElement("div");
    actions.className = "members-admin-actions";
    [
      { action: "reject", key: "members.adminReject", className: "members-admin-action--reject" },
      { action: "approve", key: "members.adminApprove", className: "" }
    ].forEach(({ action, key, className }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `members-button members-admin-action ${className}`.trim();
      button.dataset.adminAction = action;
      button.textContent = t(key);
      button.addEventListener("click", () => reviewAdminRequest(request.id, action, card));
      actions.append(button);
    });

    card.append(head, details, actions);
    adminRequestList.append(card);
  });
}

async function loadAdminRequests() {
  if (currentMember?.role !== "admin") return;
  setAdminStatus(t("members.adminLoading"));
  const { data, error } = await supabase
    .from("profile_edit_requests")
    .select("id, field_name, old_value, new_value, target_type, created_at, members!profile_edit_requests_member_id_fkey(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    setAdminStatus(t("members.adminLoadFailed", { message: error.message }));
    return;
  }
  renderAdminRequests(data || []);
  setAdminStatus();
}

async function reviewAdminRequest(requestId, action, card) {
  const actionLabel = t(action === "approve" ? "members.adminApprove" : "members.adminReject");
  if (!window.confirm(t("members.adminConfirm", { action: actionLabel }))) return;
  const buttons = card.querySelectorAll("button");
  buttons.forEach((button) => { button.disabled = true; });
  setAdminStatus();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error(t("members.adminSessionError"));
    const response = await fetch(APPROVE_REQUEST_WORKER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ request_id: requestId, action })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || response.statusText || "Request failed.");
    card.remove();
    if (!adminRequestList.children.length) renderAdminRequests([]);
    setAdminStatus(t("members.adminActionSuccess", { action: actionLabel }));
  } catch (error) {
    setAdminStatus(t("members.adminActionFailed", { message: error.message || "Request failed." }));
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function showLogin(messageKey = "") {
  currentMember = null;
  currentTeamMember = null;
  adminTab.hidden = true;
  adminPanel.hidden = true;
  adminRequestList.replaceChildren();
  setAdminStatus();
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
  currentTeamMember = null;
  bioRow.hidden = true;
  snsRow.hidden = true;
  try {
    const response = await fetch("./content/team.json");
    if (!response.ok) throw new Error("Could not load team profile.");
    const { members = [] } = await response.json();
    const teamMember = members.find((entry) => entry.name === member.name);
    if (!teamMember) return;
    currentTeamMember = teamMember;
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
  pendingRequests.hidden = true;
  pendingRequestList.replaceChildren();
  pendingRequestBlock.hidden = true;
  pendingRequestCount = 0;
  adminTab.hidden = true;
  adminPanel.hidden = true;
  adminRequestList.replaceChildren();
  setAdminStatus();
  setStatus();

  const { data: member, error } = await supabase
    .from("members")
    .select("id, name, student_id, contact, role")
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
  adminTab.hidden = member.role !== "admin";
  nameEl.textContent = member.name || "—";
  studentIdEl.textContent = member.student_id || "—";
  contactEl.textContent = member.contact || "—";
  await Promise.all([loadRecords(member), loadTeamProfile(member), loadPendingRequests()]);
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  if (currentUser) await showDashboard(currentUser);
  else showLogin();
}

tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.memberTab)));
requestOpenButton.addEventListener("click", openRequestModal);
requestCloseButtons.forEach((button) => button.addEventListener("click", closeRequestModal));
requestModal.addEventListener("click", (event) => { if (event.target === requestModal) closeRequestModal(); });

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !currentMember) return;
  const formData = new FormData(requestForm);
  const fields = [
    { name: "department", targetType: "public", oldValue: currentTeamMember?.department || "" },
    { name: "bio", targetType: "public", oldValue: currentTeamMember?.bio || "" },
    { name: "sns", targetType: "public", oldValue: currentTeamMember?.sns || "" },
    { name: "student_id", targetType: "private", oldValue: currentMember.student_id || "" },
    { name: "contact", targetType: "private", oldValue: currentMember.contact || "" }
  ];
  const requests = fields.map((field) => ({ ...field, newValue: sanitizeInput(formData.get(field.name)) })).filter((field) => field.newValue);
  if (!requests.length) {
    setRequestStatus("members.requestRequired");
    return;
  }
  const submitButton = requestForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setRequestStatus();
  const { error } = await supabase.from("profile_edit_requests").insert(requests.map((request) => ({
    member_id: currentMember.id,
    field_name: request.name,
    old_value: request.oldValue,
    new_value: request.newValue,
    status: "pending",
    target_type: request.targetType
  })));
  submitButton.disabled = false;
  if (error) {
    setRequestStatus("members.requestFailed");
    return;
  }
  closeRequestModal();
  setStatus("members.requestSubmitted");
  await loadPendingRequests();
});

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
  if (currentMember) {
    loadRecords(currentMember);
    loadPendingRequests();
    if (currentMember.role === "admin" && !adminPanel.hidden) loadAdminRequests();
  }
});
window.addEventListener("pageshow", checkSession);

await checkSession();
