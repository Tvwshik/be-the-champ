// Staff approves a pending cash top-up: credit wallet + log txn
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({ request_id: z.string().uuid(), action: z.enum(["approve", "reject"]) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) return json({ error: "Invalid token" }, 401);

    // Verify staff/admin
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isStaff = (roles ?? []).some((r) => r.role === "staff" || r.role === "admin");
    if (!isStaff) return json({ error: "Forbidden" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { request_id, action } = parsed.data;

    const { data: tr } = await supabase.from("topup_requests").select("*").eq("id", request_id).single();
    if (!tr) return json({ error: "Not found" }, 404);
    if (tr.status !== "pending") return json({ error: "Already resolved" }, 400);

    if (action === "reject") {
      await supabase.from("topup_requests").update({
        status: "rejected", approved_by: userData.user.id, resolved_at: new Date().toISOString(),
      }).eq("id", request_id);
      return json({ ok: true });
    }

    // Approve: credit wallet
    const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", tr.user_id).single();
    const newBal = Number((Number(profile!.wallet_balance) + Number(tr.amount)).toFixed(2));
    await supabase.from("profiles").update({ wallet_balance: newBal }).eq("id", tr.user_id);
    await supabase.from("wallet_transactions").insert({
      user_id: tr.user_id, amount: Number(tr.amount), type: "topup_cash",
      description: `Cash top-up · code ${tr.code}`, reference_id: tr.id, balance_after: newBal,
    });
    await supabase.from("topup_requests").update({
      status: "approved", approved_by: userData.user.id, resolved_at: new Date().toISOString(),
    }).eq("id", request_id);

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
