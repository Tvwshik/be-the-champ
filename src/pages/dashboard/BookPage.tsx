import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trash2, Calendar, Armchair } from "lucide-react";

type Station = { id: string; name: string; type: string; hourly_rate: number; capacity: number; description: string | null };
type Seat = { id: string; station_id: string; label: string; position: number; is_active: boolean };

const TYPE_LABEL: Record<string, string> = {
  pc_standard: "HALL", pc_vip: "VIP", pc_vvip: "VVIP", pc_stage: "STAGE", pc_scorpion: "SCORPION",
  console: "Консол", room: "Тусдаа өрөө",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "хүлээгдэж буй",
  confirmed: "баталгаажсан",
  checked_in: "ирсэн",
  completed: "дууссан",
  cancelled: "цуцалсан",
};

function nowPlus(min: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + min);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export default function BookPage() {
  const [params] = useSearchParams();
  const preset = params.get("station");

  const [stations, setStations] = useState<Station[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [stationId, setStationId] = useState<string>(preset ?? "");
  const [seatIds, setSeatIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1); // for single-cap stations
  const [start, setStart] = useState<string>(nowPlus(15));
  const [hours, setHours] = useState<number>(2);
  const [busy, setBusy] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [taken, setTaken] = useState<Record<string, number>>({});
  const [takenSeats, setTakenSeats] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      supabase.from("stations").select("*").eq("is_active", true).order("name"),
      supabase.from("station_seats").select("*").eq("is_active", true).order("position"),
    ]).then(([st, sts]) => {
      setStations((st.data ?? []) as Station[]);
      setSeats((sts.data ?? []) as Seat[]);
    });
    refreshMyBookings();
  }, []);

  const station = stations.find((s) => s.id === stationId);
  const filtered = stations.filter((s) => filterType === "all" || s.type === filterType);
  const stationSeats = seats.filter((s) => s.station_id === stationId);
  const needsSeatPick = !!station && station.capacity > 1 && stationSeats.length > 0;

  const seatCount = needsSeatPick ? seatIds.length : Math.max(1, quantity);
  const cost = station ? Number((Number(station.hourly_rate) * hours * seatCount).toFixed(2)) : 0;

  const startISO = useMemo(() => new Date(start).toISOString(), [start]);
  const endISO = useMemo(() => new Date(new Date(start).getTime() + hours * 3600_000).toISOString(), [start, hours]);

  // Reset selections whenever the station or time window changes
  useEffect(() => {
    setSeatIds([]);
    setQuantity(1);
  }, [stationId, startISO, endISO]);

  useEffect(() => {
    if (!stations.length) return;
    supabase.from("bookings").select("station_id, seat_id")
      .in("status", ["confirmed", "checked_in"])
      .lt("start_time", endISO).gt("end_time", startISO)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        const seatSet = new Set<string>();
        (data ?? []).forEach((r: any) => {
          counts[r.station_id] = (counts[r.station_id] ?? 0) + 1;
          if (r.seat_id) seatSet.add(r.seat_id);
        });
        setTaken(counts);
        setTakenSeats(seatSet);
      });
  }, [stations, startISO, endISO]);

  const freeCount = (s: Station) => Math.max(0, s.capacity - (taken[s.id] ?? 0));
  const stationFree = station ? freeCount(station) : 0;

  function toggleSeat(id: string) {
    setSeatIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function refreshMyBookings() {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("bookings").select("*, stations(name, type), station_seats:seat_id(label)")
        .eq("user_id", data.user.id).gte("end_time", new Date().toISOString())
        .order("start_time")
        .then(({ data }) => setBookings(data ?? []));
    });
  }

  async function book() {
    if (!stationId) { toast({ title: "Суудал сонгоно уу", variant: "destructive" }); return; }
    if (needsSeatPick && seatIds.length === 0) {
      toast({ title: "Тоглох PC-гээ сонгоно уу", variant: "destructive" });
      return;
    }
    setBusy(true);
    const body: any = { station_id: stationId, start_time: startISO, end_time: endISO };
    if (needsSeatPick) body.seat_ids = seatIds;
    else body.quantity = quantity;

    const { data, error } = await supabase.functions.invoke("create-booking", { body });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Захиалга амжилтгүй", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    const n = (data as any).count ?? 1;
    toast({ title: "Захиалсан!", description: `${n} PC · ${(data as any).cost.toLocaleString("mn-MN")}₮ төлөгдлөө. Үлдэгдэл: ${(data as any).balance.toLocaleString("mn-MN")}₮` });
    refreshMyBookings();
  }

  async function cancel(id: string) {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) toast({ title: "Цуцлах амжилтгүй", description: error.message, variant: "destructive" });
    else { toast({ title: "Цуцлагдлаа" }); refreshMyBookings(); }
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Суудал захиалах</h1>
      <p className="text-muted-foreground mb-6">Хэзээ, хэдэн цаг, ямар суудал гэдгээ сонго.</p>

      <Card className="p-6 mb-8">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Эхлэх цаг</Label>
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Үргэлжлэх хугацаа (цаг)</Label>
            <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((h) => <SelectItem key={h} value={String(h)}>{h} цаг</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Шүүлт</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүх төрөл</SelectItem>
                <SelectItem value="pc_standard">HALL</SelectItem>
                <SelectItem value="pc_vip">VIP</SelectItem>
                <SelectItem value="pc_vvip">VVIP</SelectItem>
                <SelectItem value="pc_stage">STAGE</SelectItem>
                <SelectItem value="pc_scorpion">SCORPION</SelectItem>
                <SelectItem value="room">Тусдаа өрөө</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Энэ цагт боломжтой суудлууд</Label>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((s) => {
              const free = freeCount(s);
              const isAv = free > 0;
              const fullyFree = free === s.capacity;
              const selected = stationId === s.id;
              return (
                <button key={s.id} disabled={!isAv} onClick={() => setStationId(s.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selected ? "border-primary bg-primary/10 glow-cyan" :
                    isAv ? "border-border hover:border-primary/50" :
                    "border-border/40 opacity-40 cursor-not-allowed"
                  }`}>
                  <div className="flex items-start justify-between">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-secondary font-bold text-sm">{Number(s.hourly_rate).toLocaleString("mn-MN")}₮/ц</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{TYPE_LABEL[s.type]}</span>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        !isAv ? "bg-destructive" : fullyFree ? "bg-success" : "bg-warning"
                      }`}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      {!isAv ? "Дүүрсэн" : `${free} / ${s.capacity} сул`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Seat picker for multi-PC stations (HALL / VIP / VVIP / STAGE / ROOM) */}
        {needsSeatPick && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <Label className="flex items-center gap-2 mb-0">
                <Armchair className="h-4 w-4 text-primary" />
                {station?.name}-ийн PC сонгох (хэд хэдийг сонгож болно)
              </Label>
              <span className="text-xs text-muted-foreground">
                {seatIds.length} / {stationSeats.length} сонгосон
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {stationSeats.map((seat) => {
                const isTaken = takenSeats.has(seat.id);
                const selected = seatIds.includes(seat.id);
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={isTaken}
                    onClick={() => toggleSeat(seat.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      selected
                        ? "border-primary bg-primary/15 glow-cyan"
                        : isTaken
                        ? "border-border/40 opacity-40 cursor-not-allowed bg-muted/20"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <Armchair className={`h-5 w-5 mx-auto mb-1 ${
                      selected ? "text-primary" : isTaken ? "text-muted-foreground" : "text-foreground"
                    }`} />
                    <span className="text-xs font-semibold block">{seat.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {isTaken ? "Захиалагдсан" : selected ? "Сонгосон" : "Сул"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity stepper for stations without per-seat picking (e.g. SCORPION suite, capacity > 1 but no seats) */}
        {!!station && !needsSeatPick && station.capacity > 1 && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <Label className="mb-3 block">PC-ийн тоо</Label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>−</Button>
              <span className="font-display text-2xl w-12 text-center">{quantity}</span>
              <Button type="button" variant="outline" size="icon"
                onClick={() => setQuantity((q) => Math.min(stationFree, q + 1))}
                disabled={quantity >= stationFree}>+</Button>
              <span className="text-xs text-muted-foreground ml-2">{stationFree} сул</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/40">
          <div>
            <p className="text-sm text-muted-foreground">
              Нийт {seatCount > 1 && <span>· {seatCount} PC × {hours}ц</span>}
            </p>
            <p className="font-display text-2xl text-secondary">{Number(cost).toLocaleString("mn-MN")}₮</p>
            {needsSeatPick && seatIds.length > 0 && station && (
              <p className="text-xs text-muted-foreground mt-1">
                {station.name} · {seatIds.map((id) => stationSeats.find((x) => x.id === id)?.label).filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <Button disabled={busy || !stationId || (needsSeatPick && seatIds.length === 0)} onClick={book} size="lg"
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
            {busy ? "Захиалж байна…" : "Захиалга баталгаажуулах"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl mb-4 flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Миний удахгүй болох захиалгууд</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Удахгүй болох захиалга алга.</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div>
                  <p className="font-semibold">{b.stations?.name} <Badge variant="outline" className="ml-2">{STATUS_LABEL[b.status] ?? b.status}</Badge></p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {Number(b.total_cost).toLocaleString("mn-MN")}₮
                  </p>
                </div>
                {b.status === "confirmed" && (
                  <Button variant="ghost" size="sm" onClick={() => cancel(b.id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
