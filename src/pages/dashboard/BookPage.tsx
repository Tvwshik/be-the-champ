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
import { Trash2, Calendar } from "lucide-react";

type Station = { id: string; name: string; type: string; hourly_rate: number; capacity: number; description: string | null };

const TYPE_LABEL: Record<string, string> = {
  pc_standard: "Энгийн PC", pc_vip: "VIP PC", console: "Консол", room: "Тусдаа өрөө",
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
  const [filterType, setFilterType] = useState<string>("all");
  const [stationId, setStationId] = useState<string>(preset ?? "");
  const [start, setStart] = useState<string>(nowPlus(15));
  const [hours, setHours] = useState<number>(2);
  const [busy, setBusy] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [available, setAvailable] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("stations").select("*").eq("is_active", true).order("name")
      .then(({ data }) => setStations((data ?? []) as Station[]));
    refreshMyBookings();
  }, []);

  const station = stations.find((s) => s.id === stationId);
  const cost = station ? Number((Number(station.hourly_rate) * hours).toFixed(2)) : 0;
  const filtered = stations.filter((s) => filterType === "all" || s.type === filterType);

  const startISO = useMemo(() => new Date(start).toISOString(), [start]);
  const endISO = useMemo(() => new Date(new Date(start).getTime() + hours * 3600_000).toISOString(), [start, hours]);

  useEffect(() => {
    if (!stations.length) return;
    supabase.from("bookings").select("station_id")
      .in("status", ["confirmed", "checked_in"])
      .lt("start_time", endISO).gt("end_time", startISO)
      .then(({ data }) => {
        const taken = new Set((data ?? []).map((r: any) => r.station_id));
        const av = new Set(stations.filter((s) => !taken.has(s.id)).map((s) => s.id));
        setAvailable(av);
      });
  }, [stations, startISO, endISO]);

  function refreshMyBookings() {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("bookings").select("*, stations(name, type)")
        .eq("user_id", data.user.id).gte("end_time", new Date().toISOString())
        .order("start_time")
        .then(({ data }) => setBookings(data ?? []));
    });
  }

  async function book() {
    if (!stationId) { toast({ title: "Суудал сонгоно уу", variant: "destructive" }); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-booking", {
      body: { station_id: stationId, start_time: startISO, end_time: endISO },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Захиалга амжилтгүй", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Захиалсан!", description: `$${(data as any).cost.toFixed(2)} төлөгдлөө. Үлдэгдэл: $${(data as any).balance.toFixed(2)}` });
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
                <SelectItem value="pc_standard">Энгийн PC</SelectItem>
                <SelectItem value="pc_vip">VIP PC</SelectItem>
                <SelectItem value="console">Консол</SelectItem>
                <SelectItem value="room">Тусдаа өрөө</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Энэ цагт боломжтой суудлууд</Label>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((s) => {
              const isAv = available.has(s.id);
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
                    <span className="text-secondary font-bold text-sm">${s.hourly_rate}/ц</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{TYPE_LABEL[s.type]}</span>
                  {!isAv && <Badge variant="outline" className="mt-1 text-[10px]">Захиалагдсан</Badge>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/40">
          <div>
            <p className="text-sm text-muted-foreground">Нийт</p>
            <p className="font-display text-2xl text-secondary">${cost.toFixed(2)}</p>
          </div>
          <Button disabled={busy || !stationId} onClick={book} size="lg"
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
                    {new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${Number(b.total_cost).toFixed(2)}
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
