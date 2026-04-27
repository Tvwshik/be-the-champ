// Edge function: place a food order, debit wallet
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  station_id: z.string().uuid().nullable().optional(),
  seat_label: z.string().max(50).nullable().optional(),
  notes: z.string().max(300).optional(),
  items: z.array(z.object({
    menu_item_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(30),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) return json({ error: "Invalid token" }, 401);
    const user = userData.user;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { items, station_id, seat_label, notes } = parsed.data;

    if (!station_id && !seat_label) return json({ error: "Provide station or seat label" }, 400);

    const ids = items.map((i) => i.menu_item_id);
    const { data: menu } = await supabase.from("menu_items").select("*").in("id", ids).eq("is_available", true);
    if (!menu || menu.length !== ids.length) return json({ error: "Some items unavailable" }, 400);

    let total = 0;
    const orderItemsRows = items.map((i) => {
      const m = menu.find((x: any) => x.id === i.menu_item_id)!;
      const lineTotal = Number(m.price) * i.quantity;
      total += lineTotal;
      return { menu_item_id: m.id, name: m.name, unit_price: Number(m.price), quantity: i.quantity };
    });
    total = Number(total.toFixed(2));

    const { data: profile } = await supabase.from("profiles").select("wallet_balance, is_suspended").eq("id", user.id).single();
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (profile.is_suspended) return json({ error: "Account suspended" }, 403);
    const balance = Number(profile.wallet_balance);
    if (balance < total) return json({ error: `Insufficient balance. Need $${total.toFixed(2)}, have $${balance.toFixed(2)}` }, 402);

    const newBalance = Number((balance - total).toFixed(2));

    const { data: order, error: oErr } = await supabase.from("orders").insert({
      user_id: user.id, station_id: station_id ?? null, seat_label: seat_label ?? null,
      total, notes: notes ?? null, status: "received",
    }).select().single();
    if (oErr) return json({ error: oErr.message }, 500);

    await supabase.from("order_items").insert(orderItemsRows.map((r) => ({ ...r, order_id: order.id })));
    await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", user.id);
    await supabase.from("wallet_transactions").insert({
      user_id: user.id, amount: -total, type: "order",
      description: `Food order ${order.id.slice(0, 8)}`, reference_id: order.id, balance_after: newBalance,
    });

    return json({ order, total, balance: newBalance });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
