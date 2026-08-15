// Cloudflare Worker source for whitelist-gated member self-registration.
// Deploy manually in Cloudflare as its own Worker (separate from snu-swim-approve-request)
// and configure this environment variable there: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// This Worker is intentionally unauthenticated (no Supabase session exists yet at signup
// time) — that is exactly why it is kept out of approve-request.js, which gates every
// action behind an admin bearer token at the top of its fetch handler. Keeping this Worker
// separate means that gate never has to be touched or reasoned about for a public route.
//
// Consider adding a Cloudflare-level rate limiting rule on this Worker's route, since it
// is the only endpoint in this project reachable without any Supabase session.

// Replace "*" with "https://snuswimmingteam.org" before restricting production origins.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

// Error "code" strings are a stable contract with js/members.js, which maps each one to a
// localized (KR/EN) message via members.signupError.<code>. Never send free-text error
// detail to the caller here — this route is public/unauthenticated, unlike
// approve-request.js's admin-only actions, so internal state must not be exposed.
class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
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
  if (!value) throw new HttpError(500, "server_error");
  return value;
}

function restHeaders(env) {
  const key = requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
}

function encodeFilter(value) {
  return encodeURIComponent(String(value));
}

async function readJson(response, errorCode) {
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* Response body is optional. */ }
  if (!response.ok) {
    console.error("External API request failed.", { status: response.status, body: text });
    throw new HttpError(response.status, errorCode);
  }
  return body;
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function findAuthUserByEmail(email, env) {
  const baseUrl = requiredEnv(env, "SUPABASE_URL");
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${baseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: restHeaders(env) });
    const body = await readJson(response, "server_error");
    const users = Array.isArray(body?.users) ? body.users : [];
    const user = users.find((entry) => normalizeEmail(entry.email) === email);
    if (user) return user;
    if (users.length < 1000) break;
  }
  return null;
}

// invited_members rows are written with an already-lowercased email by both writers
// (the admin bulk-register UI in js/members.js and this Worker never insert), so a plain
// equality filter is enough — no need for an ilike/lower() filter trick here.
async function getInvitedMember(email, env) {
  const response = await fetch(
    `${requiredEnv(env, "SUPABASE_URL")}/rest/v1/invited_members?select=id,email,name,used&email=eq.${encodeFilter(email)}`,
    { headers: restHeaders(env) }
  );
  const rows = await readJson(response, "server_error");
  if (rows.length > 1) throw new HttpError(500, "server_error"); // Should be impossible: unique index on lower(email).
  return rows[0] || null;
}

// Single-statement conditional UPDATE — the WHERE used=eq.false makes this the atomic
// "claim" that prevents two concurrent signups for the same whitelist row from both
// succeeding.
async function claimInvitedMember(id, env) {
  const response = await fetch(
    `${requiredEnv(env, "SUPABASE_URL")}/rest/v1/invited_members?id=eq.${encodeFilter(id)}&used=eq.false`,
    {
      method: "PATCH",
      headers: { ...restHeaders(env), Prefer: "return=representation" },
      body: JSON.stringify({ used: true, used_at: new Date().toISOString() })
    }
  );
  const rows = await readJson(response, "server_error");
  return rows.length > 0;
}

async function releaseClaim(id, env) {
  try {
    await fetch(`${requiredEnv(env, "SUPABASE_URL")}/rest/v1/invited_members?id=eq.${encodeFilter(id)}`, {
      method: "PATCH",
      headers: restHeaders(env),
      body: JSON.stringify({ used: false, used_at: null })
    });
  } catch (error) {
    console.error("Could not release invite claim after a later failure.", error);
  }
}

async function linkInviteToMember(id, memberId, env) {
  try {
    await fetch(`${requiredEnv(env, "SUPABASE_URL")}/rest/v1/invited_members?id=eq.${encodeFilter(id)}`, {
      method: "PATCH",
      headers: restHeaders(env),
      body: JSON.stringify({ member_id: memberId })
    });
  } catch (error) {
    console.error("Could not record invite -> member link (non-fatal).", error);
  }
}

async function createAuthUser(email, password, env) {
  const response = await fetch(`${requiredEnv(env, "SUPABASE_URL")}/auth/v1/admin/users`, {
    method: "POST",
    headers: restHeaders(env),
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  if (response.ok) return;
  const text = await response.text();
  console.error("Auth account creation failed.", { status: response.status, body: text });
  throw new HttpError(400, /password/i.test(text) ? "weak_password" : "server_error");
}

async function getMemberByEmail(email, env) {
  const response = await fetch(
    `${requiredEnv(env, "SUPABASE_URL")}/rest/v1/members?select=id,email,name,role,status&email=eq.${encodeFilter(email)}`,
    { headers: restHeaders(env) }
  );
  const members = await readJson(response, "server_error");
  return members[0] || null;
}

// Mirrors createMemberRecord() in worker/approve-request.js: a 409 means a members row
// already exists for this email (e.g. left over from an earlier incomplete attempt), and
// it is reused only if it matches exactly what this signup would have created.
async function createMemberRecord(email, name, env) {
  const response = await fetch(`${requiredEnv(env, "SUPABASE_URL")}/rest/v1/members`, {
    method: "POST",
    headers: { ...restHeaders(env), Prefer: "return=representation" },
    body: JSON.stringify({ email, name, role: "member", status: "active" })
  });
  if (response.status === 409) {
    const existing = await getMemberByEmail(email, env);
    if (!existing || existing.name !== name || existing.role !== "member" || existing.status !== "active") {
      throw new HttpError(500, "server_error");
    }
    return existing;
  }
  const created = await readJson(response, "server_error");
  if (!created?.[0]?.id) throw new HttpError(500, "server_error");
  return created[0];
}

async function selfRegister(body, env) {
  const email = normalizeEmail(body?.email);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !email.includes("@") || email.length > 320 || !name || name.length > 200 || password.length < 6 || password.length > 200) {
    throw new HttpError(400, "invalid_input");
  }

  // Whether the email is unknown or the name doesn't match, the response is identical —
  // this must never reveal which whitelist emails exist.
  const invited = await getInvitedMember(email, env);
  if (!invited || invited.name.trim() !== name) throw new HttpError(403, "no_match");
  // Past this point email+name are confirmed to match a whitelist entry, so a more
  // specific message is no longer an enumeration risk.
  if (invited.used) throw new HttpError(409, "already_registered");
  if (await findAuthUserByEmail(email, env)) throw new HttpError(409, "account_exists");

  const claimed = await claimInvitedMember(invited.id, env);
  if (!claimed) throw new HttpError(409, "claim_conflict");

  try {
    await createAuthUser(email, password, env);
  } catch (error) {
    await releaseClaim(invited.id, env);
    throw error;
  }

  try {
    const member = await createMemberRecord(email, name, env);
    await linkInviteToMember(invited.id, member.id, env);
  } catch (error) {
    // The Auth account now exists but the members row failed. Do not release the claim —
    // retrying self-register would only hit account_exists. An admin can find the Auth
    // user in the Supabase dashboard and finish the members row via create_member_account.
    console.error("Member record creation failed after the Auth account was created.", error);
    throw new HttpError(500, "server_error");
  }

  return { ok: true };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== "POST") return json({ error: "server_error" }, 405);
    try {
      const body = await request.json();
      const result = await selfRegister(body, env);
      return json(result, 201);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.code }, error.status);
      console.error("Self-registration failed.", error);
      return json({ error: "server_error" }, 500);
    }
  }
};
