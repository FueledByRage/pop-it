const SUPABASE_URL = "process.env.SUPABASE_URL";
const SUPABASE_KEY = "process.env.SUPABASE_KEY";

let supabaseAvailable = false;
let supabaseClient = null;

(function initSupabase() {
  if (SUPABASE_URL.includes("process.env") || SUPABASE_KEY.includes("process.env")) return;

  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    supabaseAvailable = true;
  } catch (e) {
    console.warn("Falha ao inicializar Supabase:", e);
  }
})();
