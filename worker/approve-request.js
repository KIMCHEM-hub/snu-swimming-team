// Cloudflare Worker source for profile-edit request review.
// Deploy manually in Cloudflare and configure these environment variables there:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY
// Optional: GITHUB_BRANCH (defaults to "main").

const PRIVATE_FIELDS = new Set(["student_id", "contact"]);
const PUBLIC_FIELDS = new Set(["department", "bio", "sns", "photo", "legacy_photo"]);

// CORS is restricted to the production site, the GitHub Pages fallback domain (see
// CONTEXT.md's Auth redirect-URL note for why that one's also live), and localhost/127.0.0.1
// on any port for local development. This only affects which origins a *browser* is willing
// to let read the response — it is not an auth boundary (that's verifyAdmin()'s Bearer token
// check below) — but there is no reason to advertise "*" to the entire web either.
const PRODUCTION_ORIGIN = "https://snuswimmingteam.org";
const ALLOWED_ORIGINS = new Set([PRODUCTION_ORIGIN, "https://kimchem-hub.github.io"]);
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
function corsOriginFor(request) {
  const origin = request.headers.get("Origin");
  if (origin && (ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN_RE.test(origin))) return origin;
  return PRODUCTION_ORIGIN;
}
function corsHeaders(corsOrigin) {
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin"
  };
}

// sanitizeInput(value) — server-side mirror of js/members.js's client-side sanitizeInput().
// The client strips <script> blocks and angle brackets before a member submits a profile
// edit request, but that only runs in the browser: an authenticated member can insert into
// public.profile_edit_requests directly (their own RLS insert permission) and skip the
// client entirely. Re-applying the same stripping here — once, in getRequest(), before any
// write path uses new_value — closes that bypass so the stored source-of-truth
// (content/team.json, content/legacy.json, the members table) never holds raw markup
// either. Render-time HTML-escaping (js/main.js's escapeHtml()) remains the actual XSS
// boundary for the public TEAM page; this is defense-in-depth on top of it, not a
// replacement — a value could clear this filter yet still contain "&"/quotes that only
// escapeHtml() needs to handle at render time.
function sanitizeInput(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/[<>]/g, "");
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(body, status = 200, corsOrigin = PRODUCTION_ORIGIN) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(corsOrigin), "content-type": "application/json; charset=utf-8" }
  });
}

// Missing-env-var messages used to include the variable name in the response body — that's
// internal deployment detail an admin caller doesn't need and shouldn't have handed to them.
// The name still goes to the Worker's own log via console.error for whoever configures it.
function requiredEnv(env, name) {
  const value = env[name];
  if (!value) {
    console.error(`Missing Worker environment variable: ${name}`);
    throw new HttpError(500, "Server configuration error.");
  }
  return value;
}

function restHeaders(env, authorization) {
  return {
    apikey: requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY"),
    Authorization: authorization || `Bearer ${requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY")}`,
    "content-type": "application/json"
  };
}

function encodeFilter(value) {
  return encodeURIComponent(String(value));
}

async function readJson(response, message) {
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* Response body is optional. */ }
  if (!response.ok) {
    console.error("External API request failed.", { status: response.status, body: text });
    throw new HttpError(response.status, message);
  }
  return body;
}

async function verifyAdmin(request, env) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new HttpError(401, "Missing Supabase session token.");

  const userResponse = await fetch(`${requiredEnv(env, "SUPABASE_URL")}/auth/v1/user`, {
    headers: restHeaders(env, authorization)
  });
  const user = await readJson(userResponse, "Invalid Supabase session token.");
  if (!user?.id) throw new HttpError(401, "Invalid Supabase session token.");

  const memberResponse = await fetch(
    `${requiredEnv(env, "SUPABASE_URL")}/rest/v1/members?select=id,role&email=eq.${encodeFilter(user.email || "")}`,
    { headers: restHeaders(env) }
  );
  const members = await readJson(memberResponse, "Could not verify administrator role.");
  if (!members?.[0] || members[0].role !== "admin") throw new HttpError(403, "Administrator role required.");
  return { user, authorization };
}

async function setMemberStatus(memberId, status, authorization, env) {
  if (!memberId || !["active", "OB"].includes(status)) {
    throw new HttpError(400, "member_id and a valid status are required.");
  }
  const response = await fetch(`${requiredEnv(env, "SUPABASE_URL")}/rest/v1/rpc/set_member_status`, {
    method: "POST",
    headers: restHeaders(env, authorization),
    body: JSON.stringify({ p_member_id: memberId, p_status: status })
  });
  const updated = await readJson(response, "Could not update member status.");
  const member = updated?.[0];
  if (!member?.id || !member?.name) throw new HttpError(404, "Member not found.");
  return member;
}

async function updatePublicTeamMemberStatus(member, env) {
  const repository = requiredEnv(env, "GITHUB_REPOSITORY");
  const branch = env.GITHUB_BRANCH || "main";
  const githubHeaders = {
    Authorization: `Bearer ${requiredEnv(env, "GITHUB_TOKEN")}`,
    "User-Agent": "snu-swim-approve-request-worker",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "content-type": "application/json"
  };
  const fileUrl = `https://api.github.com/repos/${repository}/contents/content/team.json?ref=${encodeURIComponent(branch)}`;
  const file = await readJson(await fetch(fileUrl, { headers: githubHeaders }), "Could not load content/team.json from GitHub.");
  let team;
  try {
    team = JSON.parse(decodeBase64Utf8(file.content));
  } catch {
    throw new HttpError(502, "GitHub returned an invalid team.json file.");
  }
  const teamMember = team?.members?.find((entry) => entry.memberId === member.id)
    || team?.members?.find((entry) => entry.name === member.name);
  if (!teamMember) return "not_applicable";
  if ((teamMember.status || "active") === member.status) return "updated";
  teamMember.status = member.status;
  const commitResponse = await fetch(fileUrl.replace(`?ref=${encodeURIComponent(branch)}`, ""), {
    method: "PUT",
    headers: githubHeaders,
    body: JSON.stringify({
      message: `Set member status ${member.id} to ${member.status}`,
      content: encodeBase64Utf8(`${JSON.stringify(team, null, 2)}\n`),
      sha: file.sha,
      branch
    })
  });
  await readJson(commitResponse, "Could not commit content/team.json to GitHub.");
  return "updated";
}

async function getRequest(requestId, env) {
  const response = await fetch(
    `${requiredEnv(env, "SUPABASE_URL")}/rest/v1/profile_edit_requests?select=id,member_id,field_name,old_value,new_value,status,target_type&id=eq.${encodeFilter(requestId)}`,
    { headers: restHeaders(env) }
  );
  const requests = await readJson(response, "Could not load edit request.");
  const editRequest = requests?.[0];
  if (!editRequest) throw new HttpError(404, "Edit request not found.");
  if (editRequest.status !== "pending") throw new HttpError(409, "Edit request has already been reviewed.");
  if (editRequest.target_type === "private" && !PRIVATE_FIELDS.has(editRequest.field_name)) {
    throw new HttpError(400, "Unsupported private profile field.");
  }
  if (editRequest.target_type === "public" && !PUBLIC_FIELDS.has(editRequest.field_name)) {
    throw new HttpError(400, "Unsupported public profile field.");
  }
  if (editRequest.target_type !== "private" && editRequest.target_type !== "public") {
    throw new HttpError(400, "Unsupported request target type.");
  }
  if (typeof editRequest.new_value === "string") editRequest.new_value = sanitizeInput(editRequest.new_value);
  return editRequest;
}

async function updatePrivateMember(editRequest, env) {
  const response = await fetch(
    `${requiredEnv(env, "SUPABASE_URL")}/rest/v1/members?id=eq.${encodeFilter(editRequest.member_id)}`,
    {
      method: "PATCH",
      headers: { ...restHeaders(env), Prefer: "return=representation" },
      body: JSON.stringify({ [editRequest.field_name]: editRequest.new_value })
    }
  );
  const updated = await readJson(response, "Could not update private member information.");
  if (!updated?.length) throw new HttpError(404, "Member for this edit request was not found.");
}

function decodeBase64Utf8(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const MEMBER_ROLES = new Set(["member", "coach", "admin"]);

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function findAuthUserByEmail(email, env) {
  const baseUrl = requiredEnv(env, "SUPABASE_URL");
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${baseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: restHeaders(env) });
    const body = await readJson(response, "Could not check existing Auth accounts.");
    const users = Array.isArray(body?.users) ? body.users : [];
    const user = users.find((entry) => normalizeEmail(entry.email) === email);
    if (user) return user;
    if (users.length < 1000) break;
  }
  return null;
}

async function getMemberByEmail(email, env) {
  const response = await fetch(
    `${requiredEnv(env, "SUPABASE_URL")}/rest/v1/members?select=id,email,name,role,status&email=eq.${encodeFilter(email)}`,
    { headers: restHeaders(env) }
  );
  const members = await readJson(response, "Could not check existing member records.");
  if (members.length > 1) throw new HttpError(409, "More than one member record uses this email.");
  return members[0] || null;
}

function assertExistingMemberMatches(member, { email, name, role }) {
  if (!member) return;
  if (normalizeEmail(member.email) !== email || member.name !== name || member.role !== role || member.status !== "active") {
    throw new HttpError(409, "Existing member data differs from this request. Review the existing record before retrying.");
  }
}

async function createMemberRecord({ email, name, role }, env) {
  const response = await fetch(`${requiredEnv(env, "SUPABASE_URL")}/rest/v1/members`, {
    method: "POST",
    headers: { ...restHeaders(env), Prefer: "return=representation" },
    body: JSON.stringify({ email, name, role, status: "active" })
  });
  if (response.status === 409) {
    const existing = await getMemberByEmail(email, env);
    assertExistingMemberMatches(existing, { email, name, role });
    return { member: existing, created: false };
  }
  const created = await readJson(response, "Could not create member record.");
  if (!created?.[0]?.id) throw new HttpError(502, "Member record creation returned no member ID.");
  return { member: created[0], created: true };
}

async function inviteAuthUser(email, env) {
  const existing = await findAuthUserByEmail(email, env);
  if (existing) return { invited: false, existing: true };
  const response = await fetch(`${requiredEnv(env, "SUPABASE_URL")}/auth/v1/invite`, {
    method: "POST",
    headers: restHeaders(env),
    body: JSON.stringify({ email })
  });
  if (!response.ok) {
    // A concurrent retry may have created the account after the first lookup.
    if (await findAuthUserByEmail(email, env)) return { invited: false, existing: true };
    await readJson(response, "Could not send Supabase Auth invite.");
  }
  return { invited: true, existing: false };
}

async function linkSelectedTeamMember({ memberId, index, snapshot }, env) {
  if (index === null || index === undefined) return false;
  if (!Number.isInteger(index) || index < 0 || typeof snapshot !== "string") {
    throw new HttpError(400, "Invalid TEAM profile selection.");
  }
  const repository = requiredEnv(env, "GITHUB_REPOSITORY");
  const branch = env.GITHUB_BRANCH || "main";
  const githubHeaders = {
    Authorization: `Bearer ${requiredEnv(env, "GITHUB_TOKEN")}`,
    "User-Agent": "snu-swim-approve-request-worker",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "content-type": "application/json"
  };
  const fileUrl = `https://api.github.com/repos/${repository}/contents/content/team.json?ref=${encodeURIComponent(branch)}`;
  const file = await readJson(await fetch(fileUrl, { headers: githubHeaders }), "Could not load content/team.json from GitHub.");
  let team;
  try { team = JSON.parse(decodeBase64Utf8(file.content)); } catch { throw new HttpError(502, "GitHub returned an invalid team.json file."); }
  const entry = team?.members?.[index];
  if (!entry || JSON.stringify(entry) !== snapshot) {
    throw new HttpError(409, "The selected TEAM profile changed. Reload profiles and retry.");
  }
  if (entry.memberId && entry.memberId !== memberId) throw new HttpError(409, "The selected TEAM profile is already linked.");
  if (entry.memberId === memberId) return true;
  entry.memberId = memberId;
  await readJson(await fetch(fileUrl.replace(`?ref=${encodeURIComponent(branch)}`, ""), {
    method: "PUT",
    headers: githubHeaders,
    body: JSON.stringify({
      message: `Link TEAM profile to member ${memberId}`,
      content: encodeBase64Utf8(`${JSON.stringify(team, null, 2)}\n`),
      sha: file.sha,
      branch
    })
  }), "Could not commit TEAM memberId link.");
  return true;
}

async function createMemberAccount(body, env) {
  const email = normalizeEmail(body?.email);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const role = body?.role || "member";
  if (!email || !email.includes("@") || !name || name.length > 200 || !MEMBER_ROLES.has(role)) {
    throw new HttpError(400, "email, name, and a valid role are required.");
  }
  const auth = await inviteAuthUser(email, env);
  const existing = await getMemberByEmail(email, env);
  assertExistingMemberMatches(existing, { email, name, role });
  const { member, created } = existing ? { member: existing, created: false } : await createMemberRecord({ email, name, role }, env);
  let teamLinked = false;
  try {
    teamLinked = await linkSelectedTeamMember({ memberId: member.id, index: body?.team_member_index, snapshot: body?.team_member_snapshot }, env);
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(error.status, `${error.message} Auth: ${auth.invited ? "invite sent" : "already exists"}; member: ${created ? "created" : "already exists"} (${member.id}).`);
    }
    throw error;
  }
  return { member_id: member.id, auth_invited: auth.invited, member_created: created, team_linked: teamLinked };
}

async function updatePublicTeamMember(editRequest, env) {
  const supabaseUrl = requiredEnv(env, "SUPABASE_URL");
  const memberResponse = await fetch(
    `${supabaseUrl}/rest/v1/members?select=id,name&id=eq.${encodeFilter(editRequest.member_id)}`,
    { headers: restHeaders(env) }
  );
  const members = await readJson(memberResponse, "Could not load member information.");
  const member = members?.[0];
  if (!member?.id || !member?.name) throw new HttpError(404, "Member for this edit request was not found.");

  const repository = requiredEnv(env, "GITHUB_REPOSITORY");
  const branch = env.GITHUB_BRANCH || "main";
  const githubHeaders = {
    Authorization: `Bearer ${requiredEnv(env, "GITHUB_TOKEN")}`,
    "User-Agent": "snu-swim-approve-request-worker",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "content-type": "application/json"
  };
  const fileUrl = `https://api.github.com/repos/${repository}/contents/content/team.json?ref=${encodeURIComponent(branch)}`;
  const fileResponse = await fetch(fileUrl, { headers: githubHeaders });
  if (!fileResponse.ok) {
    const errorBody = await fileResponse.clone().text();
    console.error("GitHub content/team.json request failed.", { status: fileResponse.status, body: errorBody });
  }
  const file = await readJson(fileResponse, "Could not load content/team.json from GitHub.");

  let team;
  try {
    team = JSON.parse(decodeBase64Utf8(file.content));
  } catch {
    throw new HttpError(502, "GitHub returned an invalid team.json file.");
  }
  const teamMember = team?.members?.find((entry) => entry.memberId === member.id)
    || team?.members?.find((entry) => entry.name === member.name);
  if (!teamMember) throw new HttpError(404, "Matching public team member was not found.");

  // A retry after a GitHub commit but before the status update must not make a duplicate commit.
  if (teamMember[editRequest.field_name] === editRequest.new_value) return;
  teamMember[editRequest.field_name] = editRequest.new_value;

  const commitResponse = await fetch(fileUrl.replace(`?ref=${encodeURIComponent(branch)}`, ""), {
    method: "PUT",
    headers: githubHeaders,
    body: JSON.stringify({
      message: `Approve profile edit request ${editRequest.id}`,
      content: encodeBase64Utf8(`${JSON.stringify(team, null, 2)}\n`),
      sha: file.sha,
      branch
    })
  });
  await readJson(commitResponse, "Could not commit content/team.json to GitHub.");
}

async function updatePublicLegacyPhoto(editRequest, env) {
  const repository = requiredEnv(env, "GITHUB_REPOSITORY");
  const branch = env.GITHUB_BRANCH || "main";
  const githubHeaders = {
    Authorization: `Bearer ${requiredEnv(env, "GITHUB_TOKEN")}`,
    "User-Agent": "snu-swim-approve-request-worker",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "content-type": "application/json"
  };
  const fileUrl = `https://api.github.com/repos/${repository}/contents/content/legacy.json?ref=${encodeURIComponent(branch)}`;
  const file = await readJson(await fetch(fileUrl, { headers: githubHeaders }), "Could not load content/legacy.json from GitHub.");

  let legacy;
  try {
    legacy = JSON.parse(decodeBase64Utf8(file.content));
  } catch {
    throw new HttpError(502, "GitHub returned an invalid legacy.json file.");
  }
  const entry = legacy?.entries?.find((item) => item.name === editRequest.old_value);
  if (!entry) throw new HttpError(404, "Matching Legacy entry was not found.");
  if (entry.photo === editRequest.new_value) return;
  entry.photo = editRequest.new_value;

  const commitResponse = await fetch(fileUrl.replace(`?ref=${encodeURIComponent(branch)}`, ""), {
    method: "PUT",
    headers: githubHeaders,
    body: JSON.stringify({
      message: `Approve Legacy photo edit request ${editRequest.id}`,
      content: encodeBase64Utf8(`${JSON.stringify(legacy, null, 2)}\n`),
      sha: file.sha,
      branch
    })
  });
  await readJson(commitResponse, "Could not commit content/legacy.json to GitHub.");
}

async function markReviewed(editRequest, status, env) {
  const response = await fetch(
    `${requiredEnv(env, "SUPABASE_URL")}/rest/v1/profile_edit_requests?id=eq.${encodeFilter(editRequest.id)}&status=eq.pending`,
    {
      method: "PATCH",
      headers: { ...restHeaders(env), Prefer: "return=representation" },
      body: JSON.stringify({ status, reviewed_at: new Date().toISOString() })
    }
  );
  const updated = await readJson(response, "Could not update edit request status.");
  if (!updated?.length) throw new HttpError(409, "Edit request has already been reviewed.");
}

export default {
  async fetch(request, env) {
    const corsOrigin = corsOriginFor(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(corsOrigin) });
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, corsOrigin);

    try {
      const admin = await verifyAdmin(request, env);
      const body = await request.json();
      if (body?.action === "create_member_account") {
        const result = await createMemberAccount(body, env);
        return json(result, 201, corsOrigin);
      }
      if (body?.action === "set_member_status") {
        const member = await setMemberStatus(body.member_id, body.status, admin.authorization, env);
        let publicMirror;
        try {
          publicMirror = await updatePublicTeamMemberStatus(member, env);
        } catch (error) {
          console.error("Public member status mirror failed.", error);
          publicMirror = "pending";
        }
        return json({ member_id: member.id, status: member.status, public_mirror: publicMirror }, 200, corsOrigin);
      }
      const requestId = body?.request_id;
      const action = body?.action;
      if (!requestId || !["approve", "reject"].includes(action)) {
        throw new HttpError(400, "request_id and action (approve or reject) are required.");
      }

      const editRequest = await getRequest(requestId, env);
      if (action === "approve") {
        if (editRequest.target_type === "private") await updatePrivateMember(editRequest, env);
        else if (editRequest.field_name === "legacy_photo") await updatePublicLegacyPhoto(editRequest, env);
        else await updatePublicTeamMember(editRequest, env);
        await markReviewed(editRequest, "approved", env);
      } else {
        await markReviewed(editRequest, "rejected", env);
      }

      return json({ request_id: editRequest.id, status: action === "approve" ? "approved" : "rejected" }, 200, corsOrigin);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, corsOrigin);
      console.error("Profile edit request review failed.", error);
      return json({ error: "Internal server error." }, 500, corsOrigin);
    }
  }
};
