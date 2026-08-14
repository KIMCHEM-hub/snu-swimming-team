// Cloudflare Worker source for profile-edit request review.
// Deploy manually in Cloudflare and configure these environment variables there:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY
// Optional: GITHUB_BRANCH (defaults to "main").

const PRIVATE_FIELDS = new Set(["student_id", "contact"]);
const PUBLIC_FIELDS = new Set(["department", "bio", "sns", "photo", "legacy_photo"]);
// Replace "*" with "https://snuswimmingteam.org" before restricting production origins.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type"
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8" }
  });
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) throw new HttpError(500, `Missing Worker environment variable: ${name}`);
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
  const teamMember = team?.members?.find((entry) => entry.name === member.name);
  if (!teamMember) throw new HttpError(404, "Matching public team member was not found.");
  if ((teamMember.status || "active") === member.status) return;
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

async function updatePublicTeamMember(editRequest, env) {
  const supabaseUrl = requiredEnv(env, "SUPABASE_URL");
  const memberResponse = await fetch(
    `${supabaseUrl}/rest/v1/members?select=name&id=eq.${encodeFilter(editRequest.member_id)}`,
    { headers: restHeaders(env) }
  );
  const members = await readJson(memberResponse, "Could not load member information.");
  const member = members?.[0];
  if (!member?.name) throw new HttpError(404, "Member for this edit request was not found.");

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
  const teamMember = team?.members?.find((entry) => entry.name === member.name);
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
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    try {
      const admin = await verifyAdmin(request, env);
      const body = await request.json();
      if (body?.action === "set_member_status") {
        const member = await setMemberStatus(body.member_id, body.status, admin.authorization, env);
        await updatePublicTeamMemberStatus(member, env);
        return json({ member_id: member.id, status: member.status });
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

      return json({ request_id: editRequest.id, status: action === "approve" ? "approved" : "rejected" });
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error("Profile edit request review failed.", error);
      return json({ error: "Internal server error." }, 500);
    }
  }
};
