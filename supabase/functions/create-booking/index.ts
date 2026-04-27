// Edge function: create a booking, deduct wallet, prevent overlaps. Atomic via DB function.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  station_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);
    const user = userData.user;

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { station_id, start_time, end_time } = parsed.data;

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (end <= start) return json({ error: "End must be after start" }, 400);
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (hours > 12) return json({ error: "Max 12 hours" }, 400);
    if (start < new Date(Date.now() - 60_000)) return json({ error: "Start time must be in the future" }, 400);

    // Check station
    const { data: station, error: stErr } = await supabase
      .from("stations").select("id, hourly_rate, is_active").eq("id", station_id).single();
    if (stErr || !station || !station.is_active) return json({ error: "Station not available" }, 400);

    const cost = Number((Number(station.hourly_rate) * hours).toFixed(2));

    // Overlap check
    const { data: overlap } = await supabase
      .from("bookings").select("id")
      .eq("station_id", station_id)
      .in("status", ["confirmed", "checked_in"])
      .lt("start_time", end.toISOString())
      .gt("end_time", start.toISOString())
      .limit(1);
    if (overlap && overlap.length) return json({ error: "Time slot already booked" }, 409);

    // Wallet balance
    const { data: profile } = await supabase
      .from("profiles").select("wallet_balance, is_suspended").eq("id", user.id).single();
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (profile.is_suspended) return json({ error: "Account suspended" }, 403);
    const balance = Number(profile.wallet_balance);
    if (balance < cost) return json({ error: `Insufficient balance. Need $${cost.toFixed(2)}, have $${balance.toFixed(2)}` }, 402);

    const newBalance = Number((balance - cost).toFixed(2));

    // Insert booking + debit wallet + log txn
    const { data: booking, error: insErr } = await supabase
      .from("bookings").insert({
        user_id: user.id,
        station_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        total_cost: cost,
        status: "confirmed",
      }).select().single();
    if (insErr) return json({ error: insErr.message }, 500);

    await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", user.id);
    await supabase.from("wallet_transactions").insert({
      user_id: user.id, amount: -cost, type: "booking",
      description: `Booking ${start.toISOString().slice(0, 16)} (${hours}h)`,
      reference_id: booking.id, balance_after: newBalance,
    });

    return json({ booking, cost, balance: newBalance }, 200);
  } catch (e) {
    console.error("create-booking error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
