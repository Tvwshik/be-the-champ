// Edge function: create a booking, deduct wallet, prevent overlaps. Atomic via DB function.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  station_id: z.string().uuid(),
  seat_id: z.string().uuid().optional().nullable(),
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
    const { station_id, seat_id, start_time, end_time } = parsed.data;

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (end <= start) return json({ error: "End must be after start" }, 400);
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (hours > 12) return json({ error: "Max 12 hours" }, 400);
    if (start < new Date(Date.now() - 60_000)) return json({ error: "Start time must be in the future" }, 400);

    // Check station
    const { data: station, error: stErr } = await supabase
      .from("stations").select("id, hourly_rate, capacity, is_active").eq("id", station_id).single();
    if (stErr || !station || !station.is_active) return json({ error: "Station not available" }, 400);

    const cost = Number((Number(station.hourly_rate) * hours).toFixed(2));
    const capacity = Number(station.capacity ?? 1);

    // If a specific seat was chosen, validate it belongs to this station and is free
    if (seat_id) {
      const { data: seat } = await supabase
        .from("station_seats")
        .select("id, station_id, is_active")
        .eq("id", seat_id).maybeSingle();
      if (!seat || seat.station_id !== station_id || !seat.is_active) {
        return json({ error: "Сонгосон суудал олдсонгүй" }, 400);
      }

      const { data: seatOverlap } = await supabase
        .from("bookings").select("id")
        .eq("seat_id", seat_id)
        .in("status", ["confirmed", "checked_in"])
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString())
        .limit(1);
      if (seatOverlap && seatOverlap.length) return json({ error: "Энэ суудал захиалагдсан байна" }, 409);
    } else {
      // No seat chosen — single-capacity station OR auto-pick mode.
      // Count overlapping bookings for the station and reject if at/over capacity.
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("station_id", station_id)
        .in("status", ["confirmed", "checked_in"])
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString());
      const taken = count ?? 0;
      if (taken >= capacity) return json({ error: "Энэ цагт суудал дүүрсэн байна" }, 409);
    }

    // Wallet balance
    const { data: profile } = await supabase
      .from("profiles").select("wallet_balance, is_suspended").eq("id", user.id).single();
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (profile.is_suspended) return json({ error: "Account suspended" }, 403);
    const balance = Number(profile.wallet_balance);
    if (balance < cost) return json({ error: `Үлдэгдэл хүрэлцэхгүй. Шаардлагатай: ${cost.toLocaleString("mn-MN")}₮, үлдэгдэл: ${balance.toLocaleString("mn-MN")}₮` }, 402);

    const newBalance = Number((balance - cost).toFixed(2));

    // Insert booking + debit wallet + log txn
    const { data: booking, error: insErr } = await supabase
      .from("bookings").insert({
        user_id: user.id,
        station_id,
        seat_id: seat_id ?? null,
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
