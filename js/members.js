import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { applyStaticTranslations, initLang, pick, t } from "./i18n.js";

const initialUrl = new URL(window.location.href);
let inviteCallbackDetected = initialUrl.searchParams.get("type") === "invite"
  || new URLSearchParams(initialUrl.hash.slice(1)).get("type") === "invite";
const INVITE_PENDING_STORAGE_KEY = "snu-swim-invite-password-user";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const loginView = document.querySelector("[data-login-view]");
const passwordResetRequestView = document.querySelector("[data-password-reset-request-view]");
const passwordResetView = document.querySelector("[data-password-reset-view]");
const invitePasswordView = document.querySelector("[data-invite-password-view]");
const signupView = document.querySelector("[data-signup-view]");
const dashboardView = document.querySelector("[data-profile-view]");
const loginForm = document.querySelector("[data-login-form]");
const signupOpenButton = document.querySelector("[data-signup-open]");
const signupCancelButton = document.querySelector("[data-signup-cancel]");
const signupForm = document.querySelector("[data-signup-form]");
const passwordResetOpenButton = document.querySelector("[data-password-reset-open]");
const passwordResetCancelButton = document.querySelector("[data-password-reset-cancel]");
const passwordResetRequestForm = document.querySelector("[data-password-reset-request-form]");
const passwordResetForm = document.querySelector("[data-password-reset-form]");
const invitePasswordForm = document.querySelector("[data-invite-password-form]");
const logoutButton = document.querySelector("[data-logout-button]");
const sessionWarning = document.querySelector("[data-session-warning]");
const sessionRemaining = document.querySelector("[data-session-remaining]");
const sessionExtendButton = document.querySelector("[data-session-extend]");
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
const profilePhotoInput = document.querySelector("[data-profile-photo-input]");
const profilePhotoPreview = document.querySelector("[data-profile-photo-preview]");
const tabs = document.querySelectorAll("[data-member-tab]");
const panels = document.querySelectorAll("[data-member-panel]");
const recordsEl = document.querySelector("[data-member-records]");
const trainingEvaluationsEl = document.querySelector("[data-member-training-evaluations]");
const memberAttendanceRateEl = document.querySelector("[data-member-attendance-rate]");
const selfReportForm = document.querySelector("[data-self-report-form]");
const selfReportParticipantsField = document.querySelector("[data-self-report-participants]");
const selfReportParticipantList = document.querySelector("[data-self-report-participant-list]");
const selfReportStatus = document.querySelector("[data-self-report-status]");
const selfReportListEl = document.querySelector("[data-self-report-list]");
const selfReportAdminStatus = document.querySelector("[data-self-report-admin-status]");
const selfReportAdminList = document.querySelector("[data-self-report-admin-list]");
const monthlyPrizeStatus = document.querySelector("[data-monthly-prize-status]");
const monthlyPrizeYearSelect = document.querySelector("[data-monthly-prize-year]");
const monthlyPrizeMonthSelect = document.querySelector("[data-monthly-prize-month]");
const monthlyPrizeLoadButton = document.querySelector("[data-monthly-prize-load]");
const monthlyPrizeConfirmButton = document.querySelector("[data-monthly-prize-confirm]");
const monthlyPrizeList = document.querySelector("[data-monthly-prize-list]");
const adminTab = document.querySelector("[data-admin-tab]");
const adminPanel = document.querySelector('[data-member-panel="admin"]');
const adminStatus = document.querySelector("[data-admin-status]");
const adminRequestList = document.querySelector("[data-admin-request-list]");
const adminCreateMemberSection = document.createElement("section");
const adminCreateMemberStatus = document.createElement("p");
const adminCreateMemberForm = document.createElement("form");
const adminCreateTeamProfiles = new Map();
adminCreateMemberSection.className = "members-coach-section";
adminCreateMemberStatus.className = "members-coach-status";
adminCreateMemberStatus.hidden = true;
adminCreateMemberForm.className = "members-coach-form";
function createAdminAccountField(labelText, control) {
  const label = document.createElement("label");
  label.className = "members-label";
  const labelEl = document.createElement("span");
  labelEl.textContent = labelText;
  label.append(labelEl, control);
  return label;
}
const adminCreateEmail = document.createElement("input");
adminCreateEmail.className = "members-input"; adminCreateEmail.name = "email"; adminCreateEmail.type = "email"; adminCreateEmail.autocomplete = "email"; adminCreateEmail.required = true;
const adminCreateName = document.createElement("input");
adminCreateName.className = "members-input"; adminCreateName.name = "name"; adminCreateName.type = "text"; adminCreateName.maxLength = 200; adminCreateName.required = true;
const adminCreateRole = document.createElement("select");
adminCreateRole.className = "members-input"; adminCreateRole.name = "role";
["member", "coach", "admin"].forEach((role) => { const option = document.createElement("option"); option.value = role; option.textContent = role; adminCreateRole.append(option); });
const adminCreateTeamSelect = document.createElement("select");
adminCreateTeamSelect.className = "members-input"; adminCreateTeamSelect.name = "team_member_index";
const adminCreateActions = document.createElement("div");
adminCreateActions.className = "members-coach-actions";
const adminCreateSubmit = document.createElement("button");
adminCreateSubmit.className = "members-button"; adminCreateSubmit.type = "submit"; adminCreateSubmit.textContent = "CREATE & INVITE";
adminCreateActions.append(adminCreateSubmit);
adminCreateMemberForm.append(
  createAdminAccountField("EMAIL", adminCreateEmail),
  createAdminAccountField("NAME", adminCreateName),
  createAdminAccountField("ROLE", adminCreateRole),
  createAdminAccountField("TEAM PROFILE (OPTIONAL)", adminCreateTeamSelect),
  adminCreateActions
);
const adminCreateMemberHeading = document.createElement("h3");
adminCreateMemberHeading.textContent = "NEW MEMBER ACCOUNT";
adminCreateMemberSection.append(adminCreateMemberHeading, adminCreateMemberStatus, adminCreateMemberForm);
const adminMemberSection = document.createElement("section");
const adminMemberStatus = document.createElement("p");
const adminMemberList = document.createElement("div");
adminMemberSection.className = "members-coach-section";
adminMemberStatus.className = "members-coach-status";
adminMemberStatus.hidden = true;
adminMemberList.className = "members-admin-list members-status-list";
const adminMemberHeading = document.createElement("h3");
adminMemberHeading.textContent = "MEMBER STATUS";
adminMemberSection.append(adminMemberHeading, adminMemberStatus, adminMemberList);
adminRequestList.after(adminCreateMemberSection);
adminCreateMemberSection.after(adminMemberSection);
const adminWhitelistSection = document.createElement("section");
const adminWhitelistStatus = document.createElement("p");
const adminWhitelistForm = document.createElement("form");
const adminWhitelistTextarea = document.createElement("textarea");
const adminWhitelistSubmit = document.createElement("button");
const adminWhitelistList = document.createElement("div");
adminWhitelistSection.className = "members-coach-section";
adminWhitelistStatus.className = "members-coach-status";
adminWhitelistStatus.hidden = true;
adminWhitelistForm.className = "members-coach-form";
adminWhitelistTextarea.className = "members-input members-textarea";
adminWhitelistTextarea.rows = 5;
adminWhitelistTextarea.placeholder = "email,name (one per line)";
adminWhitelistTextarea.required = true;
adminWhitelistSubmit.type = "submit";
adminWhitelistSubmit.className = "members-button";
adminWhitelistSubmit.textContent = "REGISTER WHITELIST";
const adminWhitelistActions = document.createElement("div");
adminWhitelistActions.className = "members-coach-actions";
adminWhitelistActions.append(adminWhitelistSubmit);
adminWhitelistForm.append(
  createAdminAccountField("EMAIL, NAME PER LINE", adminWhitelistTextarea),
  adminWhitelistActions
);
adminWhitelistList.className = "members-admin-list members-status-list";
const adminWhitelistHeading = document.createElement("h3");
adminWhitelistHeading.textContent = "INVITE WHITELIST";
const adminWhitelistIntro = document.createElement("p");
adminWhitelistIntro.textContent = "Members can self-register on the login screen only with an email + name pair listed here.";
adminWhitelistSection.append(adminWhitelistHeading, adminWhitelistIntro, adminWhitelistStatus, adminWhitelistForm, adminWhitelistList);
adminMemberSection.after(adminWhitelistSection);
const popupAdminForm = document.querySelector("[data-popup-admin-form]");
const popupAdminStatus = document.querySelector("[data-popup-admin-status]");
const popupAdminNewButton = document.querySelector("[data-popup-admin-new]");
const generalPopupList = document.querySelector("[data-general-popup-list]");
const attendanceWinnerPopupList = document.querySelector("[data-attendance-winner-popup-list]");
const popupImageInput = popupAdminForm.querySelector('[name="image_url"]');
const popupImagePreview = document.createElement("img");
let popupImageUrl = "";
popupImageInput.type = "file"; popupImageInput.name = "image"; popupImageInput.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
popupImagePreview.className = "members-photo-preview"; popupImagePreview.hidden = true; popupImageInput.after(popupImagePreview);
const coachTab = document.querySelector("[data-coach-tab]");
const coachPanel = document.querySelector('[data-member-panel="coach"]');
const coachSessionForm = document.querySelector("[data-coach-session-form]");
const coachSessionSelect = document.querySelector("[data-coach-session-select]");
const coachSessionNewButton = document.querySelector("[data-coach-session-new]");
const coachSessionStatus = document.querySelector("[data-coach-session-status]");
// One editor group per WARM-UP/MAIN SET/EVENTS/COOL-DOWN category, keyed by category.
const sessionDetailGroups = Array.from(document.querySelectorAll("[data-coach-session-details]")).reduce((map, el) => {
  map[el.dataset.coachSessionDetails] = {
    rowsEl: el.querySelector("[data-session-details-rows]"),
    addButton: el.querySelector("[data-session-details-add]")
  };
  return map;
}, {});
const coachEvaluationForm = document.querySelector("[data-coach-evaluation-form]");
const coachEvaluationBulkTemplate = document.querySelector("[data-coach-evaluation-bulk-template]");
coachEvaluationForm.replaceChildren(coachEvaluationBulkTemplate.content.cloneNode(true));
const coachEvaluationSession = document.querySelector("[data-coach-evaluation-session]");
const coachEvaluationRows = document.querySelector("[data-coach-evaluation-rows]");
const coachEvaluationStatus = document.querySelector("[data-coach-evaluation-status]");
const coachAttendanceStatus = document.querySelector("[data-coach-attendance-status]");
const coachAttendanceListEl = document.querySelector("[data-coach-attendance-list]");
let coachSubtabs = null;
let adminSubtabs = null;
let monthlyPrizeRows = [];
let monthlyPrizeLoadedYearMonth = "";
const APPROVE_REQUEST_WORKER_URL = "https://snu-swim-approve-request.chemi-kim1701.workers.dev";
const SELF_REGISTER_WORKER_URL = "https://snu-swim-self-register.chemi-kim1701.workers.dev";
let currentUser = null;
let currentMember = null;
let activeMemberDirectory = [];
let activeMemberDirectoryLoaded = false;
let currentTeamMember = null;
let statusKey = "";
const isPasswordResetRoute = new URL(window.location.href).searchParams.get("auth") === "reset";
const resetCallbackError = ["error", "error_code"].some((key) => {
  const url = new URL(window.location.href);
  return url.searchParams.has(key) || new URLSearchParams(url.hash.slice(1)).has(key);
});
let resetSessionReady = false;
let invitePasswordReady = false;
let pendingRequestCount = 0;
let profilePhotoUrl = "";
let profilePhotoUploading = false;
let legacyPhotoForm;
let legacyPhotoEntry;
let legacyPhotoInput;
let legacyPhotoPreview;
let legacyPhotoStatus;
let legacyPhotoUrl = "";
let legacyPhotoUploading = false;
let coachSessions = [];
let coachMemberDirectory = [];
const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_UPLOAD_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ATTENDANCE_TYPES = ["출석", "지각", "인정결석", "미인정결석"];
const SELF_REPORT_ACTIVITY_TYPES = ["자유수영", "3인훈련", "4인모임"];
const ATTENDANCE_RATE_WARNING_THRESHOLD = 50;
const STROKE_TYPES = ["freestyle", "backstroke", "butterfly", "breaststroke", "drill"];
const SESSION_DETAIL_CATEGORIES = ["warmup", "mainset", "events", "cooldown"];
const SESSION_DETAIL_DISTANCES = [25, 50, 75, 100, 150, 200, 300, 400, 500, 800, 1000, 1500];
const SESSION_DETAIL_SETS = Array.from({ length: 11 }, (_, i) => i); // 0..10
const SESSION_DETAIL_PACE_UNITS = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0")); // "00".."99"
const PACE_PATTERN = /^[0-9]{2}'[0-9]{2}"$/;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const SESSION_WARNING_MS = 2 * 60 * 1000;
const SESSION_DEADLINE_STORAGE_KEY = "snu-swim-session-deadline";
let sessionDeadline = 0;
let sessionTimerId = null;

function strokeLabel(value) {
  return STROKE_TYPES.includes(value) ? t(`training.stroke.${value}`) : value;
}

function attendanceTypeLabel(value) {
  return value ? t(`members.attendanceType.${value}`) : "—";
}

function activityTypeLabel(value) {
  return value ? t(`members.activityType.${value}`) : "—";
}

function activeMemberName(memberId) {
  return activeMemberDirectory.find((member) => member.id === memberId)?.name || memberId;
}

function participantNames(participantIds) {
  return (participantIds || []).map(activeMemberName).join(", ") || "—";
}

async function loadActiveMemberDirectory() {
  if (activeMemberDirectoryLoaded) return activeMemberDirectory;
  const { data, error } = await supabase.rpc("active_member_directory");
  if (error) return null;
  activeMemberDirectory = data || [];
  activeMemberDirectoryLoaded = true;
  return activeMemberDirectory;
}

function selfReportStatusLabel(value) {
  return t(`members.selfReportStatus.${value}`);
}

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function previousYearMonth() {
  const { year, month } = currentYearMonth();
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function monthlyPrizeYearMonth() {
  return `${monthlyPrizeYearSelect.value}-${String(monthlyPrizeMonthSelect.value).padStart(2, "0")}-01`;
}

function initMonthlyPrizeSelectors() {
  const { year, month } = previousYearMonth();
  [year - 1, year, year + 1].forEach((value) => appendOption(monthlyPrizeYearSelect, String(value), String(value)));
  Array.from({ length: 12 }, (_, index) => index + 1)
    .forEach((value) => appendOption(monthlyPrizeMonthSelect, String(value), String(value)));
  monthlyPrizeYearSelect.value = String(year);
  monthlyPrizeMonthSelect.value = String(month);
}

function monthlyPrizeTier(rate) {
  if (rate >= 120) return "120";
  if (rate >= 100) return "100";
  if (rate >= 80) return "80";
  return null;
}

function prizeBadge(text, modifier = "") {
  const badge = document.createElement("span");
  badge.className = `members-status-badge ${modifier}`.trim();
  badge.textContent = text;
  return badge;
}

function createMonthlyPrizeCancelButton(memberId, tier) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "members-edit-button";
  button.textContent = t("members.prizeCancelButton");
  button.addEventListener("click", async () => {
    button.disabled = true;
    const { error } = await supabase
      .from("monthly_prizes")
      .delete()
      .eq("member_id", memberId)
      .eq("year_month", monthlyPrizeLoadedYearMonth)
      .eq("tier", tier);
    if (error) {
      button.disabled = false;
      setCoachStatus(monthlyPrizeStatus, "members.prizeConfirmFailed");
      return;
    }
    await loadMonthlyPrizeReview();
  });
  return button;
}

function renderMonthlyPrizePopupForm(row, anchorRow) {
  const existingFormRow = anchorRow.parentElement.querySelector(`[data-monthly-prize-popup-form="${row.member_id}"]`);
  if (existingFormRow) {
    existingFormRow.remove();
    return;
  }

  const formRow = document.createElement("tr");
  formRow.dataset.monthlyPrizePopupForm = row.member_id;
  const cell = document.createElement("td");
  cell.colSpan = 6;
  const form = document.createElement("form");
  form.className = "members-coach-form";

  const bodyLabel = document.createElement("label");
  bodyLabel.className = "members-label";
  const bodyLabelText = document.createElement("span");
  bodyLabelText.textContent = t("members.prizePopupBody");
  const bodyInput = document.createElement("textarea");
  bodyInput.className = "members-input members-textarea";
  bodyInput.name = "body";
  bodyInput.required = true;
  bodyLabel.append(bodyLabelText, bodyInput);

  const dateGrid = document.createElement("div");
  dateGrid.className = "members-coach-grid";
  [
    ["starts_at", "members.prizePopupStartsAt"],
    ["ends_at", "members.prizePopupEndsAt"]
  ].forEach(([name, key]) => {
    const label = document.createElement("label");
    label.className = "members-label";
    const labelText = document.createElement("span");
    labelText.textContent = t(key);
    const input = document.createElement("input");
    input.className = "members-input";
    input.name = name;
    input.type = "date";
    input.required = true;
    label.append(labelText, input);
    dateGrid.append(label);
  });

  const actions = document.createElement("div");
  actions.className = "members-coach-actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "members-button members-button--secondary";
  cancelButton.textContent = t("members.prizePopupCancel");
  cancelButton.addEventListener("click", () => formRow.remove());
  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "members-button";
  saveButton.textContent = t("members.prizePopupSave");
  actions.append(cancelButton, saveButton);

  form.append(bodyLabel, dateGrid, actions);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    const values = new FormData(form);
    const { error } = await supabase.from("popups").insert({
      type: "attendance_winner",
      member_id: row.member_id,
      title: row.member_name,
      body: sanitizeInput(values.get("body")),
      starts_at: values.get("starts_at"),
      ends_at: values.get("ends_at"),
      created_by: currentUser.id
    });
    saveButton.disabled = false;
    if (error) {
      setCoachStatus(monthlyPrizeStatus, "members.prizePopupSaveFailed");
      return;
    }
    row.hasPopup = true;
    formRow.remove();
    renderMonthlyPrizeTable(monthlyPrizeRows);
    await loadPopupAdminData();
    setCoachStatus(monthlyPrizeStatus, "members.prizePopupSaved");
  });

  cell.append(form);
  formRow.append(cell);
  anchorRow.after(formRow);
}

function renderMonthlyPrizeTable(rows) {
  monthlyPrizeList.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "members-records-empty";
    empty.textContent = t("members.attendanceRateEmpty");
    monthlyPrizeList.append(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "members-records";
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>${t("members.name")}</th><th>${t("members.attendanceRateSessions")}</th><th>${t("members.attendanceRateSelfReport")}</th><th>${t("members.attendanceRateColumn")}</th><th>${t("members.prizeTierColumn")}</th><th>${t("members.prizeWinnerColumn")}</th></tr>`;
  const tbody = document.createElement("tbody");

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const tierCell = document.createElement("td");
    const winnerCell = document.createElement("td");
    const confirmedTiers = row.confirmedTiers || new Set();

    [row.member_name, row.session_count, row.self_report_score ?? 0, `${row.attendance_rate}%`].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      tr.append(cell);
    });

    tierCell.append(prizeBadge(
      row.tier ? t("members.prizeTierBadge", { tier: row.tier }) : t("members.prizeTierNone"),
      row.tier ? "members-status-badge--approved" : "members-status-badge--pending"
    ));
    if (row.tier && confirmedTiers.has(row.tier)) {
      tierCell.append(
        prizeBadge(t("members.prizeConfirmedBadge"), "members-status-badge--approved"),
        createMonthlyPrizeCancelButton(row.member_id, row.tier)
      );
    }

    const canCreatePopup = row.isWinner || ["100", "120"].includes(row.tier);
    if (row.isWinner) {
      winnerCell.append(prizeBadge(t("members.prizeWinnerBadge"), "members-status-badge--approved"));
    }
    if (canCreatePopup) {
      const popupButton = document.createElement("button");
      popupButton.type = "button";
      popupButton.className = "members-edit-button";
      popupButton.textContent = t(row.hasPopup ? "members.prizePopupExists" : "members.prizePopupCreate");
      popupButton.disabled = row.hasPopup;
      if (!row.hasPopup) popupButton.addEventListener("click", () => renderMonthlyPrizePopupForm(row, tr));
      winnerCell.append(popupButton);
    }
    if (confirmedTiers.has("winner")) {
      winnerCell.append(
        prizeBadge(t("members.prizeConfirmedBadge"), "members-status-badge--approved"),
        createMonthlyPrizeCancelButton(row.member_id, "winner")
      );
    }

    tr.append(tierCell, winnerCell);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  tableWrap.append(table);
  monthlyPrizeList.append(tableWrap);
}

async function loadMonthlyPrizeReview(year = Number(monthlyPrizeYearSelect.value), month = Number(monthlyPrizeMonthSelect.value)) {
  if (currentMember?.role !== "admin") return;
  setCoachStatus(monthlyPrizeStatus);
  const yearMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const [
    { data: rates, error: ratesError },
    { data: prizes, error: prizesError },
    { data: winnerPopups, error: winnerPopupsError }
  ] = await Promise.all([
    supabase.rpc("monthly_attendance_rates", { p_year: year, p_month: month }),
    supabase.from("monthly_prizes").select("member_id, tier").eq("year_month", yearMonth),
    supabase
      .from("popups")
      .select("type, member_id")
      .eq("type", "attendance_winner")
      .lte("starts_at", monthEnd)
      .gte("ends_at", yearMonth)
  ]);
  if (ratesError || prizesError || winnerPopupsError) {
    setCoachStatus(monthlyPrizeStatus, "members.prizeLoadFailed");
    return;
  }

  monthlyPrizeLoadedYearMonth = yearMonth;
  const highestRate = (rates || []).reduce((highest, row) => Math.max(highest, Number(row.attendance_rate)), -Infinity);
  const confirmedByMember = (prizes || []).reduce((map, prize) => {
    if (!map.has(prize.member_id)) map.set(prize.member_id, new Set());
    map.get(prize.member_id).add(prize.tier);
    return map;
  }, new Map());
  monthlyPrizeRows = (rates || []).map((row) => {
    const attendanceRate = Number(row.attendance_rate);
    return {
      ...row,
      attendance_rate: attendanceRate,
      tier: monthlyPrizeTier(attendanceRate),
      isWinner: attendanceRate === highestRate,
      confirmedTiers: confirmedByMember.get(row.member_id) || new Set(),
      hasPopup: (winnerPopups || []).some((popup) => popup.member_id === row.member_id)
    };
  });
  renderMonthlyPrizeTable(monthlyPrizeRows);
}

function setStatus(key = "") {
  statusKey = key;
  status.textContent = statusKey ? t(statusKey) : "";
  status.hidden = !statusKey;
}

function sessionDeadlineFor(user) {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_DEADLINE_STORAGE_KEY));
    return value?.userId === user?.id && Number.isFinite(value.expiresAt) ? value.expiresAt : 0;
  } catch {
    return 0;
  }
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function stopSessionTimer() {
  if (sessionTimerId) window.clearInterval(sessionTimerId);
  sessionTimerId = null;
  sessionDeadline = 0;
  sessionWarning.hidden = true;
}

async function expireSession() {
  stopSessionTimer();
  localStorage.removeItem(SESSION_DEADLINE_STORAGE_KEY);
  await supabase.auth.signOut();
  showLogin("members.sessionExpired");
}

function refreshSessionTimer() {
  const remaining = sessionDeadline - Date.now();
  if (remaining <= 0) {
    expireSession();
    return false;
  }
  sessionWarning.hidden = remaining > SESSION_WARNING_MS;
  sessionRemaining.textContent = formatRemainingTime(remaining);
  return true;
}

function startSessionTimer(user, reset = false) {
  if (!user || isPasswordResetRoute) return;
  let deadline = sessionDeadlineFor(user);
  if (!reset && deadline && deadline <= Date.now()) {
    expireSession();
    return;
  }
  if (reset || !deadline) {
    deadline = Date.now() + SESSION_TIMEOUT_MS;
    localStorage.setItem(SESSION_DEADLINE_STORAGE_KEY, JSON.stringify({ userId: user.id, expiresAt: deadline }));
  }
  sessionDeadline = deadline;
  if (sessionTimerId) window.clearInterval(sessionTimerId);
  if (!refreshSessionTimer()) return;
  sessionTimerId = window.setInterval(refreshSessionTimer, 1000);
}

function showPasswordResetRequest() {
  loginView.hidden = true;
  signupView.hidden = true;
  passwordResetRequestView.hidden = false;
  passwordResetView.hidden = true;
  invitePasswordView.hidden = true;
  dashboardView.hidden = true;
  setStatus();
}

function showPasswordReset(messageKey = "") {
  loginView.hidden = true;
  signupView.hidden = true;
  passwordResetRequestView.hidden = true;
  passwordResetView.hidden = false;
  invitePasswordView.hidden = true;
  dashboardView.hidden = true;
  passwordResetForm.hidden = !resetSessionReady;
  setStatus(messageKey);
}

function showSignup() {
  loginView.hidden = true;
  signupView.hidden = false;
  passwordResetRequestView.hidden = true;
  passwordResetView.hidden = true;
  invitePasswordView.hidden = true;
  dashboardView.hidden = true;
  setStatus();
}

function pendingInviteFor(user) {
  if (!user?.id) return false;
  try {
    if (inviteCallbackDetected) {
      sessionStorage.setItem(INVITE_PENDING_STORAGE_KEY, user.id);
      inviteCallbackDetected = false;
    }
    return sessionStorage.getItem(INVITE_PENDING_STORAGE_KEY) === user.id;
  } catch {
    const detected = inviteCallbackDetected;
    inviteCallbackDetected = false;
    return detected;
  }
}

function clearInviteCallbackUrl() {
  window.history.replaceState(null, "", "./members.html");
}

function showInvitePassword() {
  loginView.hidden = true;
  signupView.hidden = true;
  passwordResetRequestView.hidden = true;
  passwordResetView.hidden = true;
  invitePasswordView.hidden = false;
  dashboardView.hidden = true;
  setStatus();
}

function selectTab(tabName) {
  if (tabName === "admin" && currentMember?.role !== "admin") return;
  if (tabName === "coach" && !["coach", "admin"].includes(currentMember?.role)) return;
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.memberTab === tabName));
  panels.forEach((panel) => { panel.hidden = panel.dataset.memberPanel !== tabName; });
  if (tabName === "admin") { loadAdminRequests(); loadAdminMemberDirectory(); loadAdminCreateTeamProfiles(); loadAdminWhitelist(); loadLegacyPhotoEntries(); loadPopupAdminData(); loadSelfReportAdminData(); loadMonthlyPrizeReview(); }
  if (tabName === "coach") loadCoachData();
  if (tabName === "training" && currentMember) {
    loadTrainingEvaluations(currentMember);
    loadMemberAttendanceRate(currentMember);
    loadSelfReports(currentMember);
  }
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

function resetProfilePhotoSelection() {
  profilePhotoUrl = "";
  profilePhotoUploading = false;
  profilePhotoPreview.removeAttribute("src");
  profilePhotoPreview.hidden = true;
}

function imageExtension(file) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

async function uploadPublicImage(file, pathPrefix) {
  const extension = imageExtension(file);
  if (!IMAGE_UPLOAD_EXTENSIONS.has(extension) || !IMAGE_UPLOAD_MIME_TYPES.has(file.type)) {
    return { errorKey: "members.profilePhotoInvalidType" };
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) return { errorKey: "members.profilePhotoTooLarge" };

  const filePath = `${pathPrefix}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("profile-photos").upload(filePath, file, {
    contentType: file.type,
    upsert: false
  });
  if (error) return { errorKey: "upload" };
  return { publicUrl: supabase.storage.from("profile-photos").getPublicUrl(filePath).data.publicUrl };
}

async function uploadProfilePhoto(file) {
  profilePhotoUploading = true;
  profilePhotoInput.disabled = true;
  setRequestStatus("members.profilePhotoUploading");
  const result = await uploadPublicImage(file, currentMember.id);
  profilePhotoUploading = false;
  profilePhotoInput.disabled = false;
  if (result.errorKey) {
    profilePhotoInput.value = "";
    setRequestStatus(result.errorKey === "upload" ? "members.profilePhotoUploadFailed" : result.errorKey);
    return;
  }

  profilePhotoUrl = result.publicUrl;
  profilePhotoPreview.src = profilePhotoUrl;
  profilePhotoPreview.hidden = false;
  setRequestStatus();
}

function openRequestModal() {
  if (!currentUser || !currentMember) return;
  if (pendingRequestCount > 0) {
    pendingRequestBlock.hidden = false;
    return;
  }
  requestForm.reset();
  resetProfilePhotoSelection();
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

function setAdminMemberStatus(message = "") {
  adminMemberStatus.textContent = message;
  adminMemberStatus.hidden = !message;
}

function renderAdminMemberDirectory(members) {
  adminMemberList.replaceChildren();
  members.forEach((member) => {
    const card = document.createElement("article");
    card.className = "members-status-row";
    const name = document.createElement("p");
    name.className = "members-status-name";
    name.textContent = member.name || "—";
    const currentStatus = member.status === "OB" ? "OB" : "active";
    const statusText = document.createElement("span");
    statusText.className = "members-status-value";
    statusText.textContent = currentStatus;
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "members-status-switch";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.setAttribute("role", "switch");
    toggle.checked = currentStatus === "OB";
    toggle.setAttribute("aria-label", `${member.name || "Member"}: ${currentStatus}`);
    toggle.setAttribute("aria-describedby", `member-status-${member.id}`);
    statusText.id = `member-status-${member.id}`;
    toggle.addEventListener("change", async () => {
      const previousStatus = currentStatus;
      const nextStatus = toggle.checked ? "OB" : "active";
      toggle.disabled = true;
      const saved = await setMemberStatus(member.id, nextStatus);
      if (!saved) {
        toggle.checked = previousStatus === "OB";
        statusText.textContent = previousStatus;
      }
    });
    toggleLabel.append(toggle);
    card.append(name, statusText, toggleLabel);
    adminMemberList.append(card);
  });
}

async function loadAdminMemberDirectory() {
  if (currentMember?.role !== "admin") return;
  setAdminMemberStatus("Loading member status…");
  const { data, error } = await supabase.rpc("admin_member_directory");
  if (error) {
    setAdminMemberStatus(`Could not load member status: ${error.message}`);
    return;
  }
  renderAdminMemberDirectory(data || []);
  setAdminMemberStatus();
}

// isError: true colors the message as an error, false as a success, omitted/null leaves it
// neutral (in-progress messages like "Creating account…" — neither outcome yet).
function setAdminCreateMemberStatus(message = "", isError = null) {
  adminCreateMemberStatus.textContent = message;
  adminCreateMemberStatus.hidden = !message;
  adminCreateMemberStatus.classList.toggle("members-coach-status--success", isError === false);
  adminCreateMemberStatus.classList.toggle("members-coach-status--error", isError === true);
}

async function loadAdminCreateTeamProfiles() {
  if (currentMember?.role !== "admin") return;
  setAdminCreateMemberStatus("Loading TEAM profiles…");
  try {
    const response = await fetch("./content/team.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load TEAM profiles.");
    const { members = [] } = await response.json();
    adminCreateTeamProfiles.clear();
    adminCreateTeamSelect.replaceChildren();
    const none = document.createElement("option");
    none.value = ""; none.textContent = "No TEAM profile";
    adminCreateTeamSelect.append(none);
    members.forEach((entry, index) => {
      if (entry.memberId) return;
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = entry.name || `TEAM profile ${index + 1}`;
      adminCreateTeamProfiles.set(String(index), JSON.stringify(entry));
      adminCreateTeamSelect.append(option);
    });
    setAdminCreateMemberStatus();
  } catch (error) {
    setAdminCreateMemberStatus(error.message || "Could not load TEAM profiles.");
  }
}

adminCreateMemberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (currentMember?.role !== "admin") return;
  const teamMemberIndex = adminCreateTeamSelect.value;
  const teamMemberSnapshot = teamMemberIndex === "" ? null : adminCreateTeamProfiles.get(teamMemberIndex);
  if (teamMemberIndex !== "" && !teamMemberSnapshot) {
    setAdminCreateMemberStatus("Reload TEAM profiles and try again.");
    return;
  }
  adminCreateSubmit.disabled = true;
  setAdminCreateMemberStatus("Creating account and sending invite…");
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Administrator session required.");
    const response = await fetch(APPROVE_REQUEST_WORKER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_member_account",
        email: adminCreateEmail.value.trim(),
        name: adminCreateName.value.trim(),
        role: adminCreateRole.value,
        team_member_index: teamMemberIndex === "" ? null : Number(teamMemberIndex),
        team_member_snapshot: teamMemberSnapshot
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || response.statusText || "Request failed.");
    adminCreateMemberForm.reset();
    setAdminCreateMemberStatus(`Invite ready. Member ID: ${payload.member_id}${payload.team_linked ? "; TEAM linked." : "."}`, false);
    adminCreateMemberStatus.scrollIntoView({ behavior: "smooth", block: "center" });
    await Promise.all([loadAdminMemberDirectory(), loadAdminCreateTeamProfiles()]);
  } catch (error) {
    setAdminCreateMemberStatus(`Account was not fully completed: ${error.message || "Request failed."} Retry with the same details.`, true);
    adminCreateMemberStatus.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    adminCreateSubmit.disabled = false;
  }
});

function setAdminWhitelistStatus(message = "") {
  adminWhitelistStatus.textContent = message;
  adminWhitelistStatus.hidden = !message;
}

function renderAdminWhitelist(rows) {
  adminWhitelistList.replaceChildren();
  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "members-status-row";
    const label = document.createElement("p");
    label.className = "members-status-name";
    label.textContent = `${row.name} — ${row.email}`;
    const statusText = document.createElement("span");
    statusText.className = "members-status-value";
    statusText.textContent = row.used ? "USED" : "OPEN";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "members-edit-button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove ${row.email} from the whitelist`);
    removeButton.addEventListener("click", async () => {
      if (!window.confirm(`Remove ${row.email} from the whitelist?`)) return;
      removeButton.disabled = true;
      const { error } = await supabase.from("invited_members").delete().eq("id", row.id);
      if (error) {
        setAdminWhitelistStatus(`Could not remove entry: ${error.message}`);
        removeButton.disabled = false;
        return;
      }
      await loadAdminWhitelist();
    });
    card.append(label, statusText, removeButton);
    adminWhitelistList.append(card);
  });
}

async function loadAdminWhitelist() {
  if (currentMember?.role !== "admin") return;
  setAdminWhitelistStatus("Loading invite whitelist…");
  const { data, error } = await supabase
    .from("invited_members")
    .select("id, email, name, used")
    .order("created_at", { ascending: false });
  if (error) {
    setAdminWhitelistStatus(`Could not load invite whitelist: ${error.message}`);
    return;
  }
  renderAdminWhitelist(data || []);
  setAdminWhitelistStatus();
}

// Parses "email,name" lines. Returns { rows } on success, or { errorLine } naming the
// first line that failed to parse so the admin can fix and resubmit the whole batch —
// a partial insert would leave the textarea's line numbers out of sync with what saved.
function parseWhitelistInput(raw) {
  const rows = [];
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const [emailPart, ...nameParts] = lines[i].split(",");
    const email = (emailPart || "").trim().toLowerCase();
    const name = nameParts.join(",").trim();
    if (!email || !email.includes("@") || !name) return { errorLine: i + 1 };
    rows.push({ email, name });
  }
  return { rows };
}

adminWhitelistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (currentMember?.role !== "admin") return;
  const { rows, errorLine } = parseWhitelistInput(adminWhitelistTextarea.value);
  if (errorLine) {
    setAdminWhitelistStatus(`Line ${errorLine}: expected "email,name".`);
    return;
  }
  if (!rows.length) {
    setAdminWhitelistStatus("Enter at least one email,name line.");
    return;
  }
  adminWhitelistSubmit.disabled = true;
  setAdminWhitelistStatus("Registering whitelist entries…");
  const { error } = await supabase
    .from("invited_members")
    .insert(rows.map((row) => ({ ...row, created_by: currentUser.id })));
  adminWhitelistSubmit.disabled = false;
  if (error) {
    setAdminWhitelistStatus(`Could not register whitelist entries: ${error.message}`);
    return;
  }
  adminWhitelistForm.reset();
  await loadAdminWhitelist();
  setAdminWhitelistStatus(`Registered ${rows.length} whitelist ${rows.length === 1 ? "entry" : "entries"}.`);
});

async function setMemberStatus(memberId, nextStatus) {
  if (currentMember?.role !== "admin" || !["active", "OB"].includes(nextStatus)) return;
  setAdminMemberStatus("Saving member status…");
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Administrator session required.");
    const response = await fetch(APPROVE_REQUEST_WORKER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_member_status", member_id: memberId, status: nextStatus })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || response.statusText || "Request failed.");
    await loadAdminMemberDirectory();
    if (payload.public_mirror === "pending") {
      setAdminMemberStatus("DB 상태는 변경됐지만 공개 TEAM 반영은 보류됨");
    }
    return true;
  } catch (error) {
    setAdminMemberStatus(`Could not save member status: ${error.message || "Request failed."}`);
    return false;
  }
}

function setLegacyPhotoStatus(key = "") {
  legacyPhotoStatus.textContent = key ? t(key) : "";
  legacyPhotoStatus.hidden = !key;
}

function resetLegacyPhotoSelection() {
  legacyPhotoUrl = "";
  legacyPhotoUploading = false;
  legacyPhotoInput.value = "";
  legacyPhotoPreview.removeAttribute("src");
  legacyPhotoPreview.hidden = true;
}

function createLegacyPhotoForm() {
  if (legacyPhotoForm) return;
  const section = document.createElement("section");
  section.className = "members-coach-section";
  const heading = document.createElement("h3");
  heading.textContent = t("members.legacyPhotoManagement");
  const intro = document.createElement("p");
  intro.textContent = t("members.legacyPhotoIntro");
  legacyPhotoStatus = document.createElement("p");
  legacyPhotoStatus.className = "members-coach-status";
  legacyPhotoStatus.hidden = true;
  legacyPhotoForm = document.createElement("form");
  legacyPhotoForm.className = "members-coach-form";
  const entryLabel = document.createElement("label");
  entryLabel.className = "members-label";
  const entryText = document.createElement("span");
  entryText.textContent = t("members.legacyPhotoEntry");
  legacyPhotoEntry = document.createElement("select");
  legacyPhotoEntry.className = "members-input";
  legacyPhotoEntry.required = true;
  entryLabel.append(entryText, legacyPhotoEntry);
  const imageLabel = document.createElement("label");
  imageLabel.className = "members-label";
  const imageText = document.createElement("span");
  imageText.textContent = t("members.legacyPhoto");
  legacyPhotoInput = document.createElement("input");
  legacyPhotoInput.className = "members-input";
  legacyPhotoInput.type = "file";
  legacyPhotoInput.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
  legacyPhotoInput.required = true;
  const hint = document.createElement("span");
  hint.textContent = t("members.profilePhotoHint");
  legacyPhotoPreview = document.createElement("img");
  legacyPhotoPreview.className = "members-photo-preview";
  legacyPhotoPreview.hidden = true;
  imageLabel.append(imageText, legacyPhotoInput, hint, legacyPhotoPreview);
  const actions = document.createElement("div");
  actions.className = "members-coach-actions";
  const submit = document.createElement("button");
  submit.className = "members-button";
  submit.type = "submit";
  submit.textContent = t("members.sendRequest");
  actions.append(submit);
  legacyPhotoForm.append(entryLabel, imageLabel, actions);
  section.append(heading, intro, legacyPhotoStatus, legacyPhotoForm);
  adminRequestList.after(section);

  legacyPhotoEntry.addEventListener("change", resetLegacyPhotoSelection);
  legacyPhotoInput.addEventListener("change", async () => {
    const [file] = legacyPhotoInput.files || [];
    if (!file) return;
    legacyPhotoUploading = true;
    legacyPhotoInput.disabled = true;
    setLegacyPhotoStatus("members.legacyPhotoUploading");
    const result = await uploadPublicImage(file, "legacy");
    legacyPhotoUploading = false;
    legacyPhotoInput.disabled = false;
    if (result.errorKey) {
      legacyPhotoInput.value = "";
      setLegacyPhotoStatus(result.errorKey === "upload" ? "members.legacyPhotoUploadFailed" : result.errorKey);
      return;
    }
    legacyPhotoUrl = result.publicUrl;
    legacyPhotoPreview.src = legacyPhotoUrl;
    legacyPhotoPreview.hidden = false;
    setLegacyPhotoStatus();
  });
  legacyPhotoForm.addEventListener("submit", submitLegacyPhotoRequest);
}

async function loadLegacyPhotoEntries() {
  createLegacyPhotoForm();
  legacyPhotoEntry.replaceChildren();
  legacyPhotoEntry.disabled = true;
  const loading = document.createElement("option");
  loading.textContent = t("members.legacyPhotoLoading");
  loading.value = "";
  legacyPhotoEntry.append(loading);
  try {
    const response = await fetch("./content/legacy.json");
    if (!response.ok) throw new Error("Could not load Legacy stories.");
    const { entries = [] } = await response.json();
    legacyPhotoEntry.replaceChildren();
    entries.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.name;
      option.textContent = entry.name;
      legacyPhotoEntry.append(option);
    });
    legacyPhotoEntry.disabled = !entries.length;
    if (!entries.length) setLegacyPhotoStatus("members.legacyPhotoLoadFailed");
    else setLegacyPhotoStatus();
  } catch {
    legacyPhotoEntry.disabled = true;
    setLegacyPhotoStatus("members.legacyPhotoLoadFailed");
  }
}

async function submitLegacyPhotoRequest(event) {
  event.preventDefault();
  if (currentMember?.role !== "admin" || legacyPhotoUploading) return;
  if (!legacyPhotoUrl) {
    setLegacyPhotoStatus("members.legacyPhotoRequired");
    return;
  }
  const submitButton = legacyPhotoForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  const { error } = await supabase.from("profile_edit_requests").insert({
    member_id: currentMember.id,
    field_name: "legacy_photo",
    old_value: legacyPhotoEntry.value,
    new_value: legacyPhotoUrl,
    status: "pending",
    target_type: "public"
  });
  submitButton.disabled = false;
  if (error) {
    setLegacyPhotoStatus("members.requestFailed");
    return;
  }
  resetLegacyPhotoSelection();
  setLegacyPhotoStatus("members.legacyPhotoRequestSent");
  loadAdminRequests();
}

function setCoachStatus(element, key = "") {
  element.textContent = key ? t(key) : "";
  element.hidden = !key;
}

function isCoachOrAdmin() {
  return ["coach", "admin"].includes(currentMember?.role);
}

// Generalized subtab controller: wires a panel's direct .members-coach-section
// children into a tablist, keyed by i18n label keys. Used for both the coach
// panel (3 sections) and the admin panel (6 sections).
function initSubtabs(panel, tabKeys) {
  const views = panel.querySelectorAll(":scope > .members-coach-section");
  if (views.length < 2) return null;
  const tabList = document.createElement("div");
  tabList.className = "members-subtabs";
  tabList.setAttribute("role", "tablist");
  const buttons = tabKeys.map((key, index) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "members-subtab"; button.setAttribute("role", "tab");
    button.addEventListener("click", () => select(index)); tabList.append(button); return { button, key };
  });
  views[0].before(tabList);
  function select(index) {
    views.forEach((view, viewIndex) => { view.hidden = viewIndex !== index; });
    buttons.forEach((item, buttonIndex) => {
      const isActive = buttonIndex === index;
      item.button.setAttribute("aria-selected", String(isActive));
      item.button.classList.toggle("is-active", isActive);
    });
  }
  select(0);
  const render = () => buttons.forEach((item) => { item.button.textContent = t(item.key); });
  render();
  return { render };
}

function appendOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function sessionLabel(session) {
  return `${session.date} · ${session.day} · ${session.total_distance ? `${Number(session.total_distance).toLocaleString()}m` : "—"}`;
}

function resetSessionDetailsEditor() {
  SESSION_DETAIL_CATEGORIES.forEach((category) => { sessionDetailGroups[category].rowsEl.replaceChildren(); });
}

function pacePartsFromString(pace) {
  const match = typeof pace === "string" ? pace.match(/^([0-9]{2})'([0-9]{2})"$/) : null;
  return match ? [match[1], match[2]] : ["", ""];
}

// Placeholder option (empty value, disabled) shown greyed-out until a real choice is
// made — markPlaceholderState() keeps the select's own text grey/normal in sync with it.
function prependPlaceholderOption(select, label) {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = label;
  placeholder.disabled = true;
  select.prepend(placeholder);
}

function markPlaceholderState(select) {
  select.classList.toggle("is-placeholder", select.value === "");
}

function initPlaceholderSelect(select, label, initialValue) {
  prependPlaceholderOption(select, label);
  select.value = initialValue || "";
  markPlaceholderState(select);
  select.addEventListener("change", () => markPlaceholderState(select));
}

// row: {stroke, distance, content, sets, pace} — omitted fields default to a blank input
// so a freshly added row and one loaded from the DB share the same shape.
function createSessionDetailRow(category, row = {}) {
  const wrap = document.createElement("div");
  wrap.className = "members-session-detail-row";

  const distanceSelect = document.createElement("select");
  distanceSelect.className = "members-input";
  distanceSelect.dataset.role = "distance";
  SESSION_DETAIL_DISTANCES.forEach((d) => appendOption(distanceSelect, String(d), `${d}m`));
  initPlaceholderSelect(distanceSelect, t("members.sessionDetailDistance"), SESSION_DETAIL_DISTANCES.includes(row.distance) ? String(row.distance) : "");

  const strokeSelect = document.createElement("select");
  strokeSelect.className = "members-input";
  strokeSelect.dataset.role = "stroke";
  STROKE_TYPES.forEach((stroke) => appendOption(strokeSelect, stroke, strokeLabel(stroke)));
  initPlaceholderSelect(strokeSelect, t("members.sessionDetailStroke"), STROKE_TYPES.includes(row.stroke) ? row.stroke : "");

  const contentInput = document.createElement("input");
  contentInput.className = "members-input";
  contentInput.type = "text";
  contentInput.dataset.role = "content";
  contentInput.maxLength = 120;
  contentInput.placeholder = t("members.sessionDetailContent");
  contentInput.value = row.content || "";

  const setsSelect = document.createElement("select");
  setsSelect.className = "members-input";
  setsSelect.dataset.role = "sets";
  SESSION_DETAIL_SETS.forEach((n) => appendOption(setsSelect, String(n), String(n)));
  initPlaceholderSelect(setsSelect, t("members.sessionDetailSets"), Number.isInteger(row.sets) ? String(row.sets) : "");

  const [paceMinValue, paceSecValue] = pacePartsFromString(row.pace);
  const paceWrap = document.createElement("span");
  paceWrap.className = "members-pace-input";
  const paceMin = document.createElement("select");
  paceMin.className = "members-input members-input--small";
  paceMin.dataset.role = "pace-min";
  SESSION_DETAIL_PACE_UNITS.forEach((u) => appendOption(paceMin, u, u));
  initPlaceholderSelect(paceMin, t("members.sessionDetailPaceMinutes"), paceMinValue);
  const paceSep1 = document.createElement("span");
  paceSep1.className = "members-pace-sep";
  paceSep1.textContent = "'";
  const paceSec = document.createElement("select");
  paceSec.className = "members-input members-input--small";
  paceSec.dataset.role = "pace-sec";
  SESSION_DETAIL_PACE_UNITS.forEach((u) => appendOption(paceSec, u, u));
  initPlaceholderSelect(paceSec, t("members.sessionDetailPaceSeconds"), paceSecValue);
  const paceSep2 = document.createElement("span");
  paceSep2.className = "members-pace-sep";
  paceSep2.textContent = "\"";
  paceWrap.append(paceMin, paceSep1, paceSec, paceSep2);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "members-button members-button--secondary";
  removeButton.textContent = t("members.delete");
  removeButton.addEventListener("click", () => wrap.remove());

  wrap.append(distanceSelect, strokeSelect, contentInput, setsSelect, paceWrap, removeButton);
  return wrap;
}

function addSessionDetailRow(category, row = {}) {
  sessionDetailGroups[category].rowsEl.append(createSessionDetailRow(category, row));
}

async function loadSessionDetailsEditor(sessionId) {
  resetSessionDetailsEditor();
  if (!sessionId) return;
  const { data, error } = await supabase
    .from("training_session_details")
    .select("category, stroke, distance, content, sets, pace")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });
  if (error || !data) return;
  data.forEach((row) => {
    if (SESSION_DETAIL_CATEGORIES.includes(row.category)) addSessionDetailRow(row.category, row);
  });
}

function collectSessionDetailRows() {
  const rows = [];
  SESSION_DETAIL_CATEGORIES.forEach((category) => {
    Array.from(sessionDetailGroups[category].rowsEl.children).forEach((wrap, index) => {
      const distance = wrap.querySelector('[data-role="distance"]').value;
      const stroke = wrap.querySelector('[data-role="stroke"]').value;
      const content = sanitizeInput(wrap.querySelector('[data-role="content"]').value) || null;
      const sets = wrap.querySelector('[data-role="sets"]').value;
      const paceMin = wrap.querySelector('[data-role="pace-min"]').value;
      const paceSec = wrap.querySelector('[data-role="pace-sec"]').value;
      rows.push({
        category,
        stroke,
        distance: distance === "" ? null : Number(distance),
        content,
        sets: sets === "" ? null : Number(sets),
        pace: paceMin && paceSec ? `${paceMin}'${paceSec}"` : null,
        sort_order: index
      });
    });
  });
  return rows;
}

function validateSessionDetailRows(rows) {
  return rows.every((row) =>
    SESSION_DETAIL_CATEGORIES.includes(row.category)
    && STROKE_TYPES.includes(row.stroke)
    && SESSION_DETAIL_DISTANCES.includes(row.distance)
    && Number.isInteger(row.sets) && row.sets >= 0 && row.sets <= 10
    && (row.pace === null || PACE_PATTERN.test(row.pace))
  );
}

function resetCoachSessionForm() {
  coachSessionForm.reset();
  coachSessionSelect.value = "";
  resetSessionDetailsEditor();
}

function populateCoachSessionForm(sessionId) {
  const session = coachSessions.find((item) => item.id === sessionId);
  if (!session) {
    resetCoachSessionForm();
    return;
  }
  coachSessionForm.elements.date.value = session.date || "";
  coachSessionForm.elements.day.value = session.day || "";
  coachSessionForm.elements.total_distance.value = session.total_distance ?? "";
  coachSessionForm.elements.theme.value = session.theme || "";
  ["warmup", "mainset", "events", "cooldown"].forEach((field) => {
    coachSessionForm.elements[field].value = session[field] || "";
  });
  loadSessionDetailsEditor(sessionId);
}

function renderCoachSessionOptions() {
  const selectedEditId = coachSessionSelect.value;
  const selectedEvaluationId = coachEvaluationSession.value;
  coachSessionSelect.replaceChildren();
  coachEvaluationSession.replaceChildren();
  appendOption(coachSessionSelect, "", t("members.newSession"));
  appendOption(coachEvaluationSession, "", t("members.coachSelectSession"));
  coachSessions.forEach((session) => {
    const label = sessionLabel(session);
    appendOption(coachSessionSelect, session.id, label);
    appendOption(coachEvaluationSession, session.id, label);
  });
  coachSessionSelect.value = coachSessions.some((session) => session.id === selectedEditId) ? selectedEditId : "";
  coachEvaluationSession.value = coachSessions.some((session) => session.id === selectedEvaluationId) ? selectedEvaluationId : "";
}

async function loadCoachSessions() {
  if (!isCoachOrAdmin() || !currentUser) return;
  let query = supabase
    .from("training_sessions")
    .select("id, date, day, total_distance, theme, warmup, mainset, events, cooldown, created_by")
    .order("date", { ascending: false });
  if (currentMember.role === "coach") query = query.eq("created_by", currentUser.id);
  const { data, error } = await query;
  if (error) {
    setCoachStatus(coachSessionStatus, "members.sessionLoadFailed");
    return;
  }
  coachSessions = data || [];
  renderCoachSessionOptions();
}

async function loadCoachMemberDirectory() {
  if (!isCoachOrAdmin()) return;
  const { data, error } = await supabase.rpc("coach_member_directory");
  if (error) {
    setCoachStatus(coachEvaluationStatus, "members.coachDirectoryLoadFailed");
    return;
  }
  coachMemberDirectory = data || [];
}

function renderCoachEvaluationRows(sessionId, evaluations = []) {
  coachEvaluationRows.replaceChildren();
  if (!sessionId) return;
  const evaluationsByMemberId = new Map(evaluations.map((evaluation) => [evaluation.member_id, evaluation]));
  coachMemberDirectory.forEach((member) => {
    const evaluation = evaluationsByMemberId.get(member.id);
    const row = document.createElement("div");
    row.className = "members-coach-grid";
    row.dataset.memberId = member.id;
    const name = document.createElement("p");
    name.textContent = member.name;
    const attendanceLabel = document.createElement("label");
    attendanceLabel.className = "members-label";
    const attendanceName = document.createElement("span");
    attendanceName.textContent = t("members.evaluationAttendanceType");
    const attendance = document.createElement("select");
    attendance.className = "members-input";
    attendance.dataset.coachEvaluationAttendance = "";
    appendOption(attendance, "", t("members.attendanceTypeUnset"));
    ATTENDANCE_TYPES.forEach((type) => appendOption(attendance, type, attendanceTypeLabel(type)));
    attendance.value = evaluation?.attendance_type || "";
    attendanceLabel.append(attendanceName, attendance);
    const commentLabel = document.createElement("label");
    commentLabel.className = "members-label";
    const commentName = document.createElement("span");
    commentName.textContent = t("members.evaluationComment");
    const comment = document.createElement("input");
    comment.className = "members-input";
    comment.type = "text";
    comment.dataset.coachEvaluationComment = "";
    comment.value = evaluation?.comment || "";
    commentLabel.append(commentName, comment);
    row.append(name, attendanceLabel, commentLabel);
    coachEvaluationRows.append(row);
  });
}

async function loadSessionEvaluations(sessionId = coachEvaluationSession.value) {
  if (!sessionId) {
    renderCoachEvaluationRows("", []);
    return;
  }
  let query = supabase
    .from("training_evaluations")
    .select("member_id, attendance_type, comment")
    .eq("session_id", sessionId);
  if (currentMember.role === "coach") query = query.eq("created_by", currentUser.id);
  const { data, error } = await query;
  if (error) {
    setCoachStatus(coachEvaluationStatus, "members.evaluationLoadFailed");
    return;
  }
  renderCoachEvaluationRows(sessionId, data || []);
}

function renderAttendanceRateList(rows) {
  coachAttendanceListEl.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "members-records-empty";
    empty.textContent = t("members.attendanceRateEmpty");
    coachAttendanceListEl.append(empty);
    return;
  }
  const table = document.createElement("table");
  table.className = "members-records";
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>${t("members.name")}</th><th>${t("members.attendanceRateSessions")}</th><th>${t("members.attendanceRateSelfReport")}</th><th>${t("members.attendanceRateColumn")}</th></tr>`;
  const tbody = document.createElement("tbody");
  [...rows]
    .sort((a, b) => a.member_name.localeCompare(b.member_name, "ko"))
    .forEach((row) => {
      const tr = document.createElement("tr");
      if (Number(row.attendance_rate) < ATTENDANCE_RATE_WARNING_THRESHOLD) tr.classList.add("members-attendance-row--warning");
      const nameTd = document.createElement("td");
      nameTd.textContent = row.member_name;
      const sessionsTd = document.createElement("td");
      sessionsTd.textContent = row.session_count;
      const selfReportTd = document.createElement("td");
      selfReportTd.textContent = row.self_report_score ?? 0;
      const rateTd = document.createElement("td");
      rateTd.textContent = `${row.attendance_rate}%`;
      tr.append(nameTd, sessionsTd, selfReportTd, rateTd);
      tbody.append(tr);
    });
  table.append(thead, tbody);
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  tableWrap.append(table);
  coachAttendanceListEl.append(tableWrap);
}

async function loadAttendanceRateList() {
  if (!isCoachOrAdmin()) return;
  const { year, month } = currentYearMonth();
  const { data, error } = await supabase.rpc("monthly_attendance_rates", { p_year: year, p_month: month });
  if (error) {
    setCoachStatus(coachAttendanceStatus, "members.attendanceRateLoadFailed");
    return;
  }
  setCoachStatus(coachAttendanceStatus);
  renderAttendanceRateList(data || []);
}

async function loadCoachData() {
  if (!isCoachOrAdmin()) return;
  await Promise.all([loadCoachSessions(), loadCoachMemberDirectory(), loadAttendanceRateList()]);
  await loadSessionEvaluations();
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

function setSelfReportAdminStatus(message = "") {
  selfReportAdminStatus.textContent = message;
  selfReportAdminStatus.hidden = !message;
}

function renderSelfReportAdminList(items) {
  selfReportAdminList.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "members-records-empty";
    empty.textContent = t("members.selfReportAdminEmpty");
    selfReportAdminList.append(empty);
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "members-admin-request";

    const head = document.createElement("div");
    head.className = "members-admin-request-head";
    const requester = document.createElement("p");
    requester.className = "members-admin-requester";
    requester.textContent = `${t("members.name")}: ${item.member_name || "—"}`;
    const date = document.createElement("time");
    date.className = "members-admin-date";
    date.textContent = item.date;
    head.append(requester, date);

    const details = document.createElement("dl");
    details.className = "members-admin-detail";
    appendAdminDetail(details, t("members.activityType"), activityTypeLabel(item.activity_type));
    if (item.activity_type === "3인훈련") appendAdminDetail(details, t("members.selfReportParticipants"), participantNames(item.participant_ids));

    const actions = document.createElement("div");
    actions.className = "members-admin-actions";
    [
      { action: "rejected", key: "members.adminReject", className: "members-admin-action--reject" },
      { action: "approved", key: "members.adminApprove", className: "" }
    ].forEach(({ action, key, className }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `members-button members-admin-action ${className}`.trim();
      button.textContent = t(key);
      button.addEventListener("click", () => reviewSelfReport(item.id, action, card));
      actions.append(button);
    });

    card.append(head, details, actions);
    selfReportAdminList.append(card);
  });
}

async function loadSelfReportAdminData() {
  if (currentMember?.role !== "admin") return;
  setSelfReportAdminStatus(t("members.adminLoading"));
  const { data, error } = await supabase
    .from("self_reported_activities")
    .select("id, activity_type, participant_ids, date, status, members!self_reported_activities_member_id_fkey(name)")
    .eq("status", "pending")
    .order("date", { ascending: false });
  if (error) {
    setSelfReportAdminStatus(t("members.selfReportAdminLoadFailed", { message: error.message }));
    return;
  }
  await loadActiveMemberDirectory();
  const items = (data || []).map((item) => ({ ...item, member_name: Array.isArray(item.members) ? item.members[0]?.name : item.members?.name }));
  renderSelfReportAdminList(items);
  setSelfReportAdminStatus();
}

async function reviewSelfReport(id, action, card) {
  const actionLabel = t(action === "approved" ? "members.adminApprove" : "members.adminReject");
  if (!window.confirm(t("members.adminConfirm", { action: actionLabel }))) return;
  const buttons = card.querySelectorAll("button");
  buttons.forEach((button) => { button.disabled = true; });
  setSelfReportAdminStatus();
  const { data, error } = await supabase.rpc("approve_self_report", { p_id: id, p_action: action });
  if (error) {
    setSelfReportAdminStatus(t("members.selfReportAdminActionFailed", { message: error.message }));
    buttons.forEach((button) => { button.disabled = false; });
    return;
  }
  card.remove();
  if (!selfReportAdminList.children.length) renderSelfReportAdminList([]);
  const result = data?.[0];
  const creditedCount = result?.credited_member_ids?.length || 0;
  const skippedCount = result?.skipped_member_ids?.length || 0;
  const details = [];
  if (action === "approved" && creditedCount) details.push(t("members.selfReportApprovalCredited", { count: creditedCount }));
  if (action === "approved" && skippedCount) details.push(t("members.selfReportApprovalSkipped", { count: skippedCount }));
  setSelfReportAdminStatus(`${t(action === "approved" ? "members.selfReportApprovalApproved" : "members.selfReportApprovalRejected")}${details.length ? ` (${details.join(", ")})` : ""}`);
}

function setPopupAdminStatus(key = "") { popupAdminStatus.textContent = key ? t(key) : ""; popupAdminStatus.hidden = !key; }
function renderPopupAdminList(container, items, readOnly = false) {
  container.replaceChildren();
  if (!items.length) { const empty = document.createElement("p"); empty.className = "members-records-empty"; empty.textContent = t("members.popupEmpty"); container.append(empty); return; }
  items.forEach((popup) => {
    const card = document.createElement("article"); card.className = "members-admin-request";
    const title = document.createElement("p"); title.className = "members-admin-requester"; title.textContent = popup.title || popup.member_name || "—";
    const details = document.createElement("dl"); details.className = "members-admin-detail";
    appendAdminDetail(details, t("members.popupBody"), popup.body || "—"); appendAdminDetail(details, "DATE", `${popup.starts_at} → ${popup.ends_at}`);
    if (readOnly) appendAdminDetail(details, t("members.name"), popup.member_name || "—");
    card.append(title, details);
    if (!readOnly) { const actions = document.createElement("div"); actions.className = "members-admin-actions";
      const active = document.createElement("button"); active.type = "button"; active.className = "members-button members-admin-action"; active.textContent = popup.is_active ? t("members.popupActive") : t("members.popupInactive"); active.addEventListener("click", () => savePopup({ id: popup.id, is_active: !popup.is_active }));
      const edit = document.createElement("button"); edit.type = "button"; edit.className = "members-button members-admin-action"; edit.textContent = t("members.edit"); edit.addEventListener("click", () => { popupAdminForm.elements.id.value = popup.id; ["title","body","starts_at","ends_at"].forEach((key) => popupAdminForm.elements[key].value = popup[key] || ""); popupImageUrl = popup.image_url || ""; popupImagePreview.src = popupImageUrl; popupImagePreview.hidden = !popupImageUrl; });
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "members-button members-admin-action members-admin-action--reject"; remove.textContent = t("members.delete"); remove.addEventListener("click", () => deletePopup(popup.id)); actions.append(active, edit, remove); card.append(actions); }
    container.append(card);
  });
}
async function loadPopupAdminData() {
  const { data, error } = await supabase.from("popups").select("id,type,title,body,image_url,is_active,starts_at,ends_at,members!popups_member_id_fkey(name)").order("created_at", { ascending: false });
  if (error) { setPopupAdminStatus("members.popupLoadFailed"); return; }
  const items = (data || []).map((item) => ({ ...item, member_name: Array.isArray(item.members) ? item.members[0]?.name : item.members?.name }));
  renderPopupAdminList(generalPopupList, items.filter((item) => item.type === "general")); renderPopupAdminList(attendanceWinnerPopupList, items.filter((item) => item.type === "attendance_winner"), true);
}
async function savePopup(values) { const { error } = await supabase.from("popups").update(values).eq("id", values.id); if (error) setPopupAdminStatus("members.popupSaveFailed"); else { await loadPopupAdminData(); setPopupAdminStatus("members.popupSaved"); } }
async function deletePopup(id) { if (!window.confirm(t("members.delete"))) return; const { error } = await supabase.from("popups").delete().eq("id", id); if (error) setPopupAdminStatus("members.popupDeleteFailed"); else { await loadPopupAdminData(); setPopupAdminStatus("members.popupDeleted"); } }

function showLogin(messageKey = "") {
  currentMember = null;
  currentTeamMember = null;
  adminTab.hidden = true;
  adminPanel.hidden = true;
  coachTab.hidden = true;
  coachPanel.hidden = true;
  adminRequestList.replaceChildren();
  setAdminStatus();
  selfReportAdminList.replaceChildren();
  setSelfReportAdminStatus();
  loginView.hidden = false;
  signupView.hidden = true;
  passwordResetRequestView.hidden = true;
  passwordResetView.hidden = true;
  invitePasswordView.hidden = true;
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

function trainingSessionForEvaluation(evaluation) {
  return Array.isArray(evaluation.training_sessions)
    ? evaluation.training_sessions[0]
    : evaluation.training_sessions;
}

function renderTrainingEvaluations(evaluations) {
  trainingEvaluationsEl.replaceChildren();
  if (!evaluations.length) {
    const empty = document.createElement("p");
    empty.className = "members-records-empty";
    empty.textContent = t("members.trainingEvaluationsEmpty");
    trainingEvaluationsEl.append(empty);
    return;
  }
  evaluations.forEach((evaluation) => {
    const session = trainingSessionForEvaluation(evaluation);
    const card = document.createElement("article");
    card.className = "members-admin-request";
    const heading = document.createElement("p");
    heading.className = "members-admin-requester";
    const sessionDate = session?.date || "—";
    const sessionDay = session?.day ? ` (${session.day})` : "";
    heading.textContent = `${t("members.trainingSession")}: ${sessionDate}${sessionDay}`;
    const details = document.createElement("dl");
    details.className = "members-admin-detail";
    appendAdminDetail(details, t("members.trainingAttendanceType"), attendanceTypeLabel(evaluation.attendance_type));
    appendAdminDetail(details, t("members.trainingComment"), evaluation.comment || "—");
    card.append(heading, details);
    trainingEvaluationsEl.append(card);
  });
}

function renderTrainingEvaluationsMessage(key) {
  trainingEvaluationsEl.replaceChildren();
  const message = document.createElement("p");
  message.className = "members-records-empty";
  message.textContent = t(key);
  trainingEvaluationsEl.append(message);
}

async function loadTrainingEvaluations(member) {
  renderTrainingEvaluationsMessage("members.loading");
  const { data, error } = await supabase
    .from("training_evaluations")
    .select("id, attendance_type, comment, created_at, training_sessions!training_evaluations_session_id_fkey(date, day)")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false });
  if (error) {
    renderTrainingEvaluationsMessage("members.trainingEvaluationsLoadFailed");
    return;
  }
  renderTrainingEvaluations(data || []);
}

function renderMemberAttendanceRate(row) {
  memberAttendanceRateEl.replaceChildren();
  const wrapper = document.createElement("p");
  wrapper.className = "members-attendance-rate";
  if (!row || !row.session_count) {
    wrapper.textContent = t("members.attendanceRateUnavailable");
  } else {
    const isLow = Number(row.attendance_rate) < ATTENDANCE_RATE_WARNING_THRESHOLD;
    wrapper.classList.toggle("members-attendance-rate--warning", isLow);
    wrapper.textContent = t("members.attendanceRateThisMonth", { rate: row.attendance_rate });
  }
  memberAttendanceRateEl.append(wrapper);
  if (Number(row?.self_report_score) > 0) {
    const note = document.createElement("small");
    note.textContent = t("members.attendanceRateSelfReportNote", { score: row.self_report_score });
    memberAttendanceRateEl.append(note);
  }
}

async function loadMemberAttendanceRate(member) {
  const { year, month } = currentYearMonth();
  const { data, error } = await supabase.rpc("monthly_attendance_rates", { p_year: year, p_month: month });
  if (error) {
    renderMemberAttendanceRate(null);
    return;
  }
  const row = (data || []).find((item) => item.member_id === member.id);
  renderMemberAttendanceRate(row);
}

function renderSelfReportList(items) {
  selfReportListEl.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "members-records-empty";
    empty.textContent = t("members.selfReportEmpty");
    selfReportListEl.append(empty);
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "members-admin-request";
    const heading = document.createElement("p");
    heading.className = "members-admin-requester";
    heading.textContent = `${activityTypeLabel(item.activity_type)} · ${item.date}`;
    const badge = document.createElement("span");
    badge.className = `members-status-badge members-status-badge--${item.status}`;
    badge.textContent = selfReportStatusLabel(item.status);
    heading.append(badge);
    card.append(heading);
    if (item.activity_type === "3인훈련") {
      const participants = document.createElement("p");
      participants.textContent = `${t("members.selfReportParticipants")}: ${participantNames(item.participant_ids)}`;
      card.append(participants);
    }
    selfReportListEl.append(card);
  });
}

function renderSelfReportMessage(key) {
  selfReportListEl.replaceChildren();
  const message = document.createElement("p");
  message.className = "members-records-empty";
  message.textContent = t(key);
  selfReportListEl.append(message);
}

async function loadSelfReports(member) {
  renderSelfReportMessage("members.loading");
  const { data, error } = await supabase
    .from("self_reported_activities")
    .select("id, activity_type, participant_ids, date, status")
    .eq("member_id", member.id)
    .order("date", { ascending: false });
  if (error) {
    renderSelfReportMessage("members.selfReportLoadFailed");
    return;
  }
  await loadActiveMemberDirectory();
  renderSelfReportList(data || []);
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
  startSessionTimer(user);
  loginView.hidden = true;
  signupView.hidden = true;
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
  coachTab.hidden = true;
  coachPanel.hidden = true;
  adminRequestList.replaceChildren();
  setAdminStatus();
  selfReportAdminList.replaceChildren();
  setSelfReportAdminStatus();
  setStatus();

  const { data: member, error } = await supabase
    .from("members")
    .select("id, name, student_id, contact, role, status")
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
  coachTab.hidden = !["coach", "admin"].includes(member.role);
  nameEl.textContent = member.name || "—";
  studentIdEl.textContent = member.student_id || "—";
  contactEl.textContent = member.contact || "—";
  await Promise.all([loadRecords(member), loadTeamProfile(member), loadPendingRequests()]);
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  if (isPasswordResetRoute) {
    resetSessionReady = Boolean(currentUser) && !resetCallbackError;
    showPasswordReset(resetSessionReady ? "" : "members.passwordResetInvalidLink");
    return;
  }
  invitePasswordReady = pendingInviteFor(currentUser);
  if (invitePasswordReady) {
    clearInviteCallbackUrl();
    showInvitePassword();
    return;
  }
  if (currentUser) await showDashboard(currentUser);
  else showLogin();
}

tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.memberTab)));
requestOpenButton.addEventListener("click", openRequestModal);
requestCloseButtons.forEach((button) => button.addEventListener("click", closeRequestModal));
requestModal.addEventListener("click", (event) => { if (event.target === requestModal) closeRequestModal(); });
profilePhotoInput.addEventListener("change", () => {
  const [file] = profilePhotoInput.files || [];
  resetProfilePhotoSelection();
  if (file) uploadProfilePhoto(file);
});

coachSessionSelect.addEventListener("change", () => populateCoachSessionForm(coachSessionSelect.value));
coachSessionNewButton.addEventListener("click", resetCoachSessionForm);

SESSION_DETAIL_CATEGORIES.forEach((category) => {
  sessionDetailGroups[category].addButton.addEventListener("click", () => addSessionDetailRow(category));
});

coachSessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isCoachOrAdmin() || !currentUser) return;
  const submitButton = coachSessionForm.querySelector("button[type=submit]");
  const formData = new FormData(coachSessionForm);
  const distance = formData.get("total_distance");
  const detailRows = collectSessionDetailRows();
  if (!validateSessionDetailRows(detailRows)) {
    setCoachStatus(coachSessionStatus, "members.sessionDetailsInvalid");
    return;
  }
  const payload = {
    date: formData.get("date"),
    day: formData.get("day"),
    total_distance: distance === "" ? null : Number(distance),
    theme: sanitizeInput(formData.get("theme")) || null,
    warmup: sanitizeInput(formData.get("warmup")) || null,
    mainset: sanitizeInput(formData.get("mainset")) || null,
    events: sanitizeInput(formData.get("events")) || null,
    cooldown: sanitizeInput(formData.get("cooldown")) || null
  };
  submitButton.disabled = true;
  setCoachStatus(coachSessionStatus);
  const sessionId = coachSessionSelect.value;
  let savedSessionId = sessionId;
  let error;
  if (sessionId) {
    ({ error } = await supabase.from("training_sessions").update(payload).eq("id", sessionId));
  } else {
    const inserted = await supabase.from("training_sessions").insert({ ...payload, created_by: currentUser.id }).select("id").single();
    error = inserted.error;
    savedSessionId = inserted.data?.id;
  }
  // Simplest correct approach for a coach-owned, low-row-count list: replace the whole
  // set breakdown on every save rather than diffing added/changed/removed rows.
  if (!error && savedSessionId) {
    ({ error } = await supabase.from("training_session_details").delete().eq("session_id", savedSessionId));
  }
  if (!error && savedSessionId && detailRows.length) {
    ({ error } = await supabase.from("training_session_details").insert(
      detailRows.map((row) => ({ ...row, session_id: savedSessionId }))
    ));
  }
  submitButton.disabled = false;
  if (error) {
    setCoachStatus(coachSessionStatus, "members.sessionSaveFailed");
    return;
  }
  resetCoachSessionForm();
  await loadCoachSessions();
  setCoachStatus(coachSessionStatus, "members.sessionSaved");
});

coachEvaluationSession.addEventListener("change", () => loadSessionEvaluations());
coachEvaluationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isCoachOrAdmin() || !currentUser) return;
  const sessionId = coachEvaluationSession.value;
  if (!sessionId) {
    setCoachStatus(coachEvaluationStatus, "members.evaluationLoadFailed");
    return;
  }
  const submitButton = coachEvaluationForm.querySelector("button[type=submit]");
  const payload = Array.from(coachEvaluationRows.children)
    .map((row) => ({
      member_id: row.dataset.memberId,
      attendance_type: row.querySelector("[data-coach-evaluation-attendance]").value,
      comment: sanitizeInput(row.querySelector("[data-coach-evaluation-comment]").value) || null
    }))
    .filter((row) => ATTENDANCE_TYPES.includes(row.attendance_type))
    .map((row) => ({ ...row, session_id: sessionId, created_by: currentUser.id }));
  submitButton.disabled = true;
  setCoachStatus(coachEvaluationStatus);
  // Coach RLS is created_by-based, so an upsert of rows authored by another
  // coach may be rejected. The current workflow has one coach per session.
  const { error } = payload.length
    ? await supabase.from("training_evaluations").upsert(payload, { onConflict: "session_id,member_id" })
    : { error: null };
  submitButton.disabled = false;
  if (error) {
    setCoachStatus(coachEvaluationStatus, "members.evaluationBulkSaveFailed");
    return;
  }
  await loadSessionEvaluations(sessionId);
  await loadAttendanceRateList();
  setCoachStatus(coachEvaluationStatus, "members.evaluationBulkSaved");
});

function selectedSelfReportParticipantIds() {
  return Array.from(selfReportParticipantList.querySelectorAll("input[type=checkbox]:checked"), (input) => input.value);
}

function updateSelfReportParticipantRequirement() {
  const submitButton = selfReportForm.querySelector("button[type=submit]");
  submitButton.disabled = selfReportForm.elements.activity_type.value === "3인훈련" && selectedSelfReportParticipantIds().length < 3;
}

async function renderSelfReportParticipants() {
  const members = await loadActiveMemberDirectory();
  selfReportParticipantList.replaceChildren();
  if (!members || !currentMember) {
    const message = document.createElement("p");
    message.textContent = t("members.selfReportParticipantsLoadFailed");
    selfReportParticipantList.append(message);
    updateSelfReportParticipantRequirement();
    return;
  }
  members.forEach((member) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "participant_ids";
    input.value = member.id;
    input.checked = member.id === currentMember.id;
    input.disabled = member.id === currentMember.id;
    input.addEventListener("change", updateSelfReportParticipantRequirement);
    label.append(input, ` ${member.name}`);
    selfReportParticipantList.append(label);
  });
  updateSelfReportParticipantRequirement();
}

async function toggleSelfReportParticipants() {
  const isThreePersonTraining = selfReportForm.elements.activity_type.value === "3인훈련";
  selfReportParticipantsField.hidden = !isThreePersonTraining;
  if (isThreePersonTraining) await renderSelfReportParticipants();
  else {
    selfReportParticipantList.replaceChildren();
    updateSelfReportParticipantRequirement();
  }
}

selfReportForm.elements.activity_type.addEventListener("change", toggleSelfReportParticipants);
toggleSelfReportParticipants();

selfReportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !currentMember) return;
  const formData = new FormData(selfReportForm);
  const activityType = formData.get("activity_type");
  if (!SELF_REPORT_ACTIVITY_TYPES.includes(activityType)) return;
  const payload = {
    member_id: currentMember.id,
    activity_type: activityType,
    date: formData.get("date")
  };
  if (activityType === "3인훈련") {
    const participantIds = selectedSelfReportParticipantIds();
    if (participantIds.length < 3) {
      setCoachStatus(selfReportStatus, "members.selfReportParticipantsMinimum");
      return;
    }
    payload.participant_ids = participantIds;
  }
  const submitButton = selfReportForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setCoachStatus(selfReportStatus);
  const { error } = await supabase.from("self_reported_activities").insert(payload);
  submitButton.disabled = false;
  if (error) {
    setCoachStatus(selfReportStatus, error.code === "23505" ? "members.selfReportDuplicateGroup" : "members.selfReportSaveFailed");
    return;
  }
  selfReportForm.reset();
  await toggleSelfReportParticipants();
  await loadSelfReports(currentMember);
  setCoachStatus(selfReportStatus, "members.selfReportSaved");
});

popupAdminNewButton.addEventListener("click", () => { popupAdminForm.reset(); popupAdminForm.elements.id.value = ""; });
popupImageInput.addEventListener("change", async () => {
  const [file] = popupImageInput.files || []; if (!file) return;
  popupImageInput.disabled = true; setPopupAdminStatus("members.popupImageUploading");
  const result = await uploadPublicImage(file, "popup");
  popupImageInput.disabled = false;
  if (result.errorKey) { setPopupAdminStatus(result.errorKey === "upload" ? "members.popupImageUploadFailed" : result.errorKey); popupImageInput.value = ""; return; }
  popupImageUrl = result.publicUrl; popupImagePreview.src = popupImageUrl; popupImagePreview.hidden = false; setPopupAdminStatus();
});
popupAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(popupAdminForm); const id = formData.get("id");
  const payload = { title: sanitizeInput(formData.get("title")), body: sanitizeInput(formData.get("body")), image_url: popupImageUrl || null, starts_at: formData.get("starts_at"), ends_at: formData.get("ends_at") };
  const { error } = id ? await supabase.from("popups").update(payload).eq("id", id) : await supabase.from("popups").insert({ ...payload, type: "general", created_by: currentUser.id });
  if (error) { setPopupAdminStatus("members.popupSaveFailed"); return; }
  popupAdminForm.reset(); popupImageUrl = ""; popupImagePreview.hidden = true; await loadPopupAdminData(); setPopupAdminStatus("members.popupSaved");
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !currentMember) return;
  if (profilePhotoUploading) {
    setRequestStatus("members.profilePhotoUploading");
    return;
  }
  const formData = new FormData(requestForm);
  const fields = [
    { name: "department", targetType: "public", oldValue: currentTeamMember?.department || "" },
    { name: "bio", targetType: "public", oldValue: currentTeamMember?.bio || "" },
    { name: "sns", targetType: "public", oldValue: currentTeamMember?.sns || "" },
    { name: "student_id", targetType: "private", oldValue: currentMember.student_id || "" },
    { name: "contact", targetType: "private", oldValue: currentMember.contact || "" }
  ];
  const requests = fields.map((field) => ({ ...field, newValue: sanitizeInput(formData.get(field.name)) })).filter((field) => field.newValue);
  if (profilePhotoUrl) requests.unshift({
    name: "photo",
    targetType: "public",
    oldValue: currentTeamMember?.photo || "",
    newValue: profilePhotoUrl
  });
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

passwordResetOpenButton.addEventListener("click", showPasswordResetRequest);
passwordResetCancelButton.addEventListener("click", showLogin);
signupOpenButton.addEventListener("click", showSignup);
signupCancelButton.addEventListener("click", showLogin);

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const email = formData.get("email").trim();
  const name = formData.get("name").trim();
  const password = formData.get("password");
  if (password !== formData.get("passwordConfirm")) {
    setStatus("members.signupPasswordMismatch");
    return;
  }
  const submitButton = signupForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setStatus("members.signupSubmitting");
  try {
    const response = await fetch(SELF_REGISTER_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorKey = `members.signupError.${payload.error || "server_error"}`;
      setStatus(t(errorKey) === errorKey ? "members.signupError.server_error" : errorKey);
      return;
    }
    signupForm.reset();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showLogin("members.signupLoginError");
    // On success the onAuthStateChange listener below takes over and shows the dashboard.
  } catch (error) {
    setStatus("members.signupError.server_error");
  } finally {
    submitButton.disabled = false;
  }
});

passwordResetRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(passwordResetRequestForm);
  const submitButton = passwordResetRequestForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setStatus();
  const redirectTo = new URL("./members.html?auth=reset", window.location.href).href;
  const { error } = await supabase.auth.resetPasswordForEmail(formData.get("email"), { redirectTo });
  submitButton.disabled = false;
  // This response must not reveal whether an account exists for the entered email.
  setStatus(error ? "members.passwordResetRequestError" : "members.passwordResetRequestSent");
});

passwordResetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!resetSessionReady) {
    showPasswordReset("members.passwordResetInvalidLink");
    return;
  }
  const formData = new FormData(passwordResetForm);
  const password = formData.get("password");
  if (password !== formData.get("passwordConfirm")) {
    setStatus("members.passwordResetMismatch");
    return;
  }
  const submitButton = passwordResetForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setStatus();
  const { error } = await supabase.auth.updateUser({ password });
  submitButton.disabled = false;
  if (error) {
    setStatus("members.passwordResetUpdateError");
    return;
  }
  await supabase.auth.signOut();
  window.location.replace("./members.html?reset=success");
});

invitePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!invitePasswordReady || !currentUser) return;
  const formData = new FormData(invitePasswordForm);
  const password = formData.get("password");
  if (password !== formData.get("passwordConfirm")) {
    setStatus("members.passwordResetMismatch");
    return;
  }
  const submitButton = invitePasswordForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setStatus();
  const { error } = await supabase.auth.updateUser({ password });
  submitButton.disabled = false;
  if (error) {
    setStatus("members.passwordResetUpdateError");
    return;
  }
  try { sessionStorage.removeItem(INVITE_PENDING_STORAGE_KEY); } catch { /* Storage can be unavailable. */ }
  invitePasswordReady = false;
  invitePasswordForm.reset();
  clearInviteCallbackUrl();
  await showDashboard(currentUser);
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  stopSessionTimer();
  localStorage.removeItem(SESSION_DEADLINE_STORAGE_KEY);
  const { error } = await supabase.auth.signOut();
  if (error) {
    logoutButton.disabled = false;
    startSessionTimer(currentUser, true);
    setStatus("members.logoutError");
    return;
  }
  window.location.replace("./index.html");
});

sessionExtendButton.addEventListener("click", () => {
  if (currentUser) startSessionTimer(currentUser, true);
});

supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  if (isPasswordResetRoute) {
    if (resetCallbackError) {
      resetSessionReady = false;
      showPasswordReset("members.passwordResetInvalidLink");
      return;
    }
    if (event === "PASSWORD_RECOVERY") resetSessionReady = true;
    if (!resetSessionReady && !currentUser) {
      showPasswordReset("members.passwordResetInvalidLink");
      return;
    }
    showPasswordReset();
    return;
  }
  invitePasswordReady = pendingInviteFor(currentUser);
  if (invitePasswordReady) {
    clearInviteCallbackUrl();
    showInvitePassword();
    return;
  }
  if (currentUser) {
    startSessionTimer(currentUser, event === "SIGNED_IN");
    showDashboard(currentUser);
  } else {
    stopSessionTimer();
    showLogin();
  }
});

initLang();
applyStaticTranslations();
initMonthlyPrizeSelectors();
coachSubtabs = initSubtabs(coachPanel, ["members.coachTabSessions", "members.coachTabEvaluations", "members.coachTabAttendance"]);
adminSubtabs = initSubtabs(adminPanel, ["members.adminTabAccount", "members.adminTabStatus", "members.adminTabWhitelist", "members.adminTabPopups", "members.adminTabWinners", "members.adminTabSelfReports", "members.adminTabPrizes"]);
monthlyPrizeLoadButton.addEventListener("click", () => loadMonthlyPrizeReview());
monthlyPrizeConfirmButton.addEventListener("click", async () => {
  if (!monthlyPrizeLoadedYearMonth || monthlyPrizeYearMonth() !== monthlyPrizeLoadedYearMonth) {
    setCoachStatus(monthlyPrizeStatus, "members.prizeStaleData");
    return;
  }
  const rowsToConfirm = monthlyPrizeRows.flatMap((row) => {
    const records = [];
    if (row.tier) records.push({ member_id: row.member_id, year_month: monthlyPrizeLoadedYearMonth, tier: row.tier, score: row.attendance_rate });
    if (row.isWinner) records.push({ member_id: row.member_id, year_month: monthlyPrizeLoadedYearMonth, tier: "winner", score: row.attendance_rate });
    return records;
  });
  if (!rowsToConfirm.length) return;
  monthlyPrizeConfirmButton.disabled = true;
  const { error } = await supabase.from("monthly_prizes").upsert(rowsToConfirm, { onConflict: "member_id,year_month,tier" });
  monthlyPrizeConfirmButton.disabled = false;
  if (error) {
    setCoachStatus(monthlyPrizeStatus, "members.prizeConfirmFailed");
    return;
  }
  setCoachStatus(monthlyPrizeStatus, "members.prizeConfirmed");
  await loadMonthlyPrizeReview();
});
window.addEventListener("langchange", () => {
  applyStaticTranslations();
  coachSubtabs?.render();
  adminSubtabs?.render();
  setStatus(statusKey);
  if (currentMember) {
    loadRecords(currentMember);
    loadPendingRequests();
    if (!document.querySelector('[data-member-panel="training"]').hidden) {
      loadTrainingEvaluations(currentMember);
      loadMemberAttendanceRate(currentMember);
      loadSelfReports(currentMember);
    }
    if (currentMember.role === "admin" && !adminPanel.hidden) { loadAdminRequests(); loadSelfReportAdminData(); loadMonthlyPrizeReview(); }
    if (isCoachOrAdmin() && !coachPanel.hidden) { loadAttendanceRateList(); loadSessionEvaluations(); }
  }
});
window.addEventListener("pageshow", checkSession);
window.addEventListener("visibilitychange", () => {
  if (!document.hidden && sessionDeadline) refreshSessionTimer();
});
window.addEventListener("storage", (event) => {
  if (event.key !== SESSION_DEADLINE_STORAGE_KEY || !currentUser || isPasswordResetRoute) return;
  if (event.newValue) {
    startSessionTimer(currentUser);
  } else {
    stopSessionTimer();
    supabase.auth.signOut();
  }
});

await checkSession();
if (new URL(window.location.href).searchParams.get("reset") === "success") {
  showLogin("members.passwordResetSuccess");
  window.history.replaceState(null, "", "./members.html");
}
