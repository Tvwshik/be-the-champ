// Staff manual wallet adjustment (credit/debit) — for in-store cash, refunds, etc.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  user_id: z.string().uuid(),
  amount: z.number().refine((n) => n !== 0 && Math.abs(n) <= 1000),
  description: z.string().min(1).max(200),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) return json({ error: "Invalid token" }, 401);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isStaff = (roles ?? []).some((r) => r.role === "staff" || r.role === "admin");
    if (!isStaff) return json({ error: "Forbidden" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { user_id, amount, description } = parsed.data;

    const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", user_id).single();
    if (!profile) return json({ error: "User not found" }, 404);
    const newBal = Number((Number(profile.wallet_balance) + amount).toFixed(2));
    if (newBal < 0) return json({ error: "Would result in negative balance" }, 400);

    await supabase.from("profiles").update({ wallet_balance: newBal }).eq("id", user_id);
    await supabase.from("wallet_transactions").insert({
      user_id, amount, type: amount > 0 ? "topup_cash" : "adjustment",
      description, balance_after: newBal,
    });
    return json({ ok: true, balance: newBal });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
