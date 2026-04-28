import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Monitor, Gamepad, DoorOpen } from "lucide-react";

type Station = {
  id: string;
  name: string;
  type: "pc_standard" | "pc_vip" | "console" | "room";
  hourly_rate: number;
  capacity: number;
  description: string | null;
  is_active: boolean;
};

const TYPE_INFO = {
  pc_standard: { label: "Энгийн PC", icon: Monitor, color: "text-primary" },
  pc_vip: { label: "VIP PC", icon: Monitor, color: "text-secondary" },
  console: { label: "Консол", icon: Gamepad, color: "text-accent" },
  room: { label: "Тусдаа өрөө", icon: DoorOpen, color: "text-warning" },
} as const;

export default function Stations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("stations").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { setStations((data ?? []) as Station[]); setLoading(false); });
  }, []);

  const grouped = stations.reduce<Record<string, Station[]>>((acc, s) => {
    (acc[s.type] ||= []).push(s); return acc;
  }, {});

  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-2xl mb-10">
        <h1 className="font-display text-4xl md:text-5xl mb-3">
          Суудал ба <span className="text-gradient-neon">өрөө</span>
        </h1>
        <p className="text-muted-foreground">
          Зэвсгээ сонго. Энгийн тоглоомд энгийн PC, тэмцээнд VIP машин,
          хосоор тоглоход консол, найзуудтайгаа байхад тусдаа өрөө.
        </p>
      </div>

      {loading && <p className="text-muted-foreground">Суудлуудыг ачаалж байна…</p>}

      {(["pc_standard", "pc_vip", "console", "room"] as const).map((type) => {
        const items = grouped[type] ?? [];
        if (!items.length) return null;
        const info = TYPE_INFO[type];
        const Icon = info.icon;
        return (
          <section key={type} className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <Icon className={`h-6 w-6 ${info.color}`} />
              <h2 className="font-display text-2xl">{info.label}</h2>
              <Badge variant="outline" className="ml-auto">{items.length} боломжтой</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((s) => (
                <Card key={s.id} className="p-5 bg-card/60 border-border/60 hover:border-primary/50 transition-all hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-display text-lg">{s.name}</h3>
                    <span className="text-secondary font-bold">${s.hourly_rate}/цаг</span>
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground mb-3">{s.description}</p>}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">Суудал: {s.capacity}</span>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/dashboard/book?station=${s.id}`}>Захиалах</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
