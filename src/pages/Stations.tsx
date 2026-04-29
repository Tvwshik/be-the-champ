import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Monitor, Crown, Sparkles, Trophy, Flame } from "lucide-react";

type StationType =
  | "pc_standard"
  | "pc_vip"
  | "pc_vvip"
  | "pc_stage"
  | "pc_scorpion"
  | "console"
  | "room";

type Station = {
  id: string;
  name: string;
  type: StationType;
  hourly_rate: number;
  capacity: number;
  description: string | null;
  is_active: boolean;
};

const TYPE_INFO: Record<StationType, { label: string; icon: any; color: string; tagline: string }> = {
  pc_standard: { label: "HALL", icon: Monitor, color: "text-primary", tagline: "Үндсэн талбай · 7800X3D · RTX 5060 · 360Hz" },
  pc_vip: { label: "VIP", icon: Crown, color: "text-secondary", tagline: "7800X3D · RTX 5060Ti · 500Hz · Night Pass боломжтой" },
  pc_vvip: { label: "VVIP", icon: Sparkles, color: "text-accent", tagline: "9800X3D · RTX 5070 · 500Hz · Night Pass боломжтой" },
  pc_stage: { label: "STAGE", icon: Trophy, color: "text-warning", tagline: "9800X3D · RTX 5070Ti · 500Hz · тэмцээний зэрэглэл" },
  pc_scorpion: { label: "SCORPION", icon: Flame, color: "text-destructive", tagline: "Premium тусгай багц · дээд зэрэглэлийн орчин" },
  console: { label: "Консол", icon: Monitor, color: "text-primary", tagline: "PS5 / Switch" },
  room: { label: "Тусдаа өрөө", icon: Monitor, color: "text-warning", tagline: "Найз нөхөдтэйгөө" },
};

const TIER_ORDER: StationType[] = ["pc_standard", "pc_vip", "pc_vvip", "pc_stage", "pc_scorpion", "console", "room"];

const fmtMnt = (n: number) => `${n.toLocaleString("mn-MN")}₮`;

export default function Stations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [taken, setTaken] = useState<Record<string, number>>({});

  async function loadAvailability() {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("bookings")
      .select("station_id")
      .in("status", ["confirmed", "checked_in"])
      .lte("start_time", now)
      .gt("end_time", now);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { counts[r.station_id] = (counts[r.station_id] ?? 0) + 1; });
    setTaken(counts);
  }

  useEffect(() => {
    supabase.from("stations").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { setStations((data ?? []) as Station[]); setLoading(false); });
    loadAvailability();
    const id = setInterval(loadAvailability, 30_000);
    return () => clearInterval(id);
  }, []);

  const freeCount = (s: Station) => Math.max(0, s.capacity - (taken[s.id] ?? 0));

  const grouped = stations.reduce<Record<string, Station[]>>((acc, s) => {
    (acc[s.type] ||= []).push(s); return acc;
  }, {});

  const tierFree = (items: Station[]) => items.reduce((n, s) => n + freeCount(s), 0);
  const tierTotal = (items: Station[]) => items.reduce((n, s) => n + s.capacity, 0);


  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-2xl mb-10">
        <h1 className="font-display text-4xl md:text-5xl mb-3">
          Үнэ ба <span className="text-gradient-neon">багц</span>
        </h1>
        <p className="text-muted-foreground">
          HALL-аас SCORPION хүртэл — өөрийн түвшинд тохирох суудлаа сонго.
          Бүх PC-д Alienware дэлгэц, шинэ үеийн төхөөрөмж.
        </p>
      </div>

      {/* Packages strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
        <Card className="p-4 bg-gradient-to-br from-primary/15 to-transparent border-primary/40">
          <p className="text-xs text-muted-foreground mb-1">NIGHT PASS</p>
          <p className="font-display text-xl">30,000₮ <span className="text-sm text-muted-foreground">/ 10ц</span></p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-secondary/15 to-transparent border-secondary/40">
          <p className="text-xs text-muted-foreground mb-1">VIP — NP</p>
          <p className="font-display text-xl">35,000₮ <span className="text-sm text-muted-foreground">/ 10ц</span></p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-accent/15 to-transparent border-accent/40">
          <p className="text-xs text-muted-foreground mb-1">VVIP — NP</p>
          <p className="font-display text-xl">40,000₮ <span className="text-sm text-muted-foreground">/ 10ц</span></p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-warning/15 to-transparent border-warning/40">
          <p className="text-xs text-muted-foreground mb-1">SCORPION</p>
          <p className="font-display text-xl">50,000₮ <span className="text-sm text-muted-foreground">/ 1ц</span></p>
        </Card>
      </div>

      {loading && <p className="text-muted-foreground">Суудлуудыг ачаалж байна…</p>}

      {TIER_ORDER.map((type) => {
        const items = grouped[type] ?? [];
        if (!items.length) return null;
        const info = TYPE_INFO[type];
        const Icon = info.icon;
        const rate = items[0].hourly_rate;
        const free = tierFree(items);
        const total = tierTotal(items);
        const tierColor = free === 0 ? "border-destructive text-destructive" : free < total / 3 ? "border-warning text-warning" : "border-success text-success";
        return (
          <section key={type} className="mb-12">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Icon className={`h-6 w-6 ${info.color}`} />
              <h2 className="font-display text-2xl">{info.label}</h2>
              <span className="font-bold text-secondary">{fmtMnt(rate)} <span className="text-xs text-muted-foreground font-normal">/ 1 цаг</span></span>
              <Badge variant="outline" className={`ml-auto ${tierColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                {free} / {total} сул
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-5">{info.tagline}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((s) => {
                const f = freeCount(s);
                const dot = f === 0 ? "bg-destructive" : f === s.capacity ? "bg-success" : "bg-warning";
                return (
                  <Card key={s.id} className="p-5 bg-card/60 border-border/60 hover:border-primary/50 transition-all hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-display text-lg">{s.name}</h3>
                      <span className="text-secondary font-bold text-sm">{fmtMnt(s.hourly_rate)}/ц</span>
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{s.description}</p>}
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${dot} ${f > 0 ? "animate-pulse" : ""}`} />
                      <span className="text-xs text-muted-foreground">
                        {f === 0 ? "Дүүрсэн" : `${f} / ${s.capacity} сул`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Багтаамж: {s.capacity}</span>
                      <Button asChild size="sm" variant="outline" disabled={f === 0}>
                        <Link to={`/dashboard/book?station=${s.id}`}>Захиалах</Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Bonus / top-up promo */}
      <section className="mt-4">
        <h2 className="font-display text-2xl mb-5 border-l-4 border-accent pl-3">
          Цэнэглэлтийн <span className="text-gradient-neon">урамшуулал</span>
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { pay: 20000, bonus: 20 },
            { pay: 30000, bonus: 30 },
            { pay: 50000, bonus: 50 },
          ].map((b) => (
            <Card key={b.pay} className="p-6 bg-gradient-to-br from-accent/10 to-card border-accent/40 text-center">
              <p className="text-xs text-accent uppercase tracking-wider mb-2">SALE</p>
              <p className="font-display text-3xl mb-1">{fmtMnt(b.pay)}</p>
              <p className="text-secondary font-bold">+{b.bonus}% БОНУС</p>
              <p className="text-xs text-muted-foreground mt-3">
                Нийт {fmtMnt(b.pay + (b.pay * b.bonus) / 100)} хэтэвчинд
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
