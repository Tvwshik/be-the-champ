// Edge function: create one or more bookings (multi-seat), deduct wallet, prevent overlaps.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  station_id: z.string().uuid(),
  // Multi-seat selection (preferred for VIP/VVIP/HALL/STAGE/ROOM)
  seat_ids: z.array(z.string().uuid()).min(1).max(20).optional(),
  // Legacy single-seat path
  seat_id: z.string().uuid().optional().nullable(),
  // For single-capacity stations or auto-pick: how many slots to book on this station
  quantity: z.number().int().min(1).max(20).optional(),
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

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);
    const user = userData.user;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { station_id, start_time, end_time } = parsed.data;
    let { seat_ids, seat_id, quantity } = parsed.data;

    // Normalize: legacy seat_id -> seat_ids[]
    if (!seat_ids && seat_id) seat_ids = [seat_id];
    // De-dupe
    if (seat_ids) seat_ids = Array.from(new Set(seat_ids));

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (end <= start) return json({ error: "End must be after start" }, 400);
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (hours > 12) return json({ error: "Max 12 hours" }, 400);
    if (start < new Date(Date.now() - 60_000)) return json({ error: "Start time must be in the future" }, 400);

    // Station
    const { data: station, error: stErr } = await supabase
      .from("stations").select("id, hourly_rate, capacity, is_active").eq("id", station_id).single();
    if (stErr || !station || !station.is_active) return json({ error: "Station not available" }, 400);

    const capacity = Number(station.capacity ?? 1);
    const rate = Number(station.hourly_rate);

    // ---- Determine the number of seats being booked & validate ----
    let seatCount: number;

    if (seat_ids && seat_ids.length) {
      seatCount = seat_ids.length;
      if (seatCount > capacity) return json({ error: "Сонгосон суудлын тоо багтаамжаас их байна" }, 400);

      // Validate all seats belong to this station and are active
      const { data: seatRows } = await supabase
        .from("station_seats")
        .select("id, station_id, is_active")
        .in("id", seat_ids);
      if (!seatRows || seatRows.length !== seatCount
          || seatRows.some((s: any) => s.station_id !== station_id || !s.is_active)) {
        return json({ error: "Сонгосон суудал олдсонгүй" }, 400);
      }

      // Check seat-level overlap
      const { data: seatOverlap } = await supabase
        .from("bookings").select("seat_id")
        .in("seat_id", seat_ids)
        .in("status", ["confirmed", "checked_in"])
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString());
      if (seatOverlap && seatOverlap.length) {
        return json({ error: "Сонгосон суудлуудаас зарим нь захиалагдсан байна" }, 409);
      }
    } else {
      // No seat ids: auto-pick mode (e.g. SCORPION, single-capacity, or "any seat")
      seatCount = Math.max(1, quantity ?? 1);
      if (seatCount > capacity) return json({ error: "Хүссэн PC-ийн тоо багтаамжаас их байна" }, 400);

      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("station_id", station_id)
        .in("status", ["confirmed", "checked_in"])
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString());
      const taken = count ?? 0;
      if (taken + seatCount > capacity) return json({ error: "Энэ цагт хангалттай сул PC байхгүй" }, 409);
    }

    const cost = Number((rate * hours * seatCount).toFixed(2));

    // ---- Wallet ----
    const { data: profile } = await supabase
      .from("profiles").select("wallet_balance, is_suspended").eq("id", user.id).single();
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (profile.is_suspended) return json({ error: "Account suspended" }, 403);
    const balance = Number(profile.wallet_balance);
    if (balance < cost) {
      return json({ error: `Үлдэгдэл хүрэлцэхгүй. Шаардлагатай: ${cost.toLocaleString("mn-MN")}₮, үлдэгдэл: ${balance.toLocaleString("mn-MN")}₮` }, 402);
    }
    const newBalance = Number((balance - cost).toFixed(2));

    // ---- Insert N bookings (one per seat) ----
    const perSeatCost = Number((rate * hours).toFixed(2));
    const rows = (seat_ids ?? Array(seatCount).fill(null)).map((sid: string | null) => ({
      user_id: user.id,
      station_id,
      seat_id: sid,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      total_cost: perSeatCost,
      status: "confirmed",
    }));

    const { data: bookings, error: insErr } = await supabase
      .from("bookings").insert(rows).select();
    if (insErr) return json({ error: insErr.message }, 500);

    await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", user.id);
    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      amount: -cost,
      type: "booking",
      description: `Booking ${start.toISOString().slice(0, 16)} · ${hours}ц · ${seatCount} PC`,
      reference_id: bookings?.[0]?.id ?? null,
      balance_after: newBalance,
    });

    return json({ bookings, count: seatCount, cost, balance: newBalance }, 200);
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
