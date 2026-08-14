import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { t } from "./i18n.js";

const navLink = document.querySelector("[data-member-nav]");
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let isSignedIn = false;

function renderMemberNav() {
  if (!navLink) return;
  navLink.textContent = t(isSignedIn ? "nav.trainingEvaluation" : "nav.members");
  navLink.href = "./members.html";
}

supabase.auth.onAuthStateChange((_event, session) => {
  isSignedIn = Boolean(session?.user);
  renderMemberNav();
});

window.addEventListener("langchange", renderMemberNav);
const { data: { session } } = await supabase.auth.getSession();
isSignedIn = Boolean(session?.user);
renderMemberNav();
