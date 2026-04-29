import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Item = { id: string; name: string; description: string | null; price: number; category_id: string | null };
type Cat = { id: string; name: string };

const ORDER_STATUS_LABEL: Record<string, string> = {
  received: "хүлээн авсан",
  preparing: "бэлтгэж буй",
  delivered: "хүргэгдсэн",
  cancelled: "цуцалсан",
};

export default function OrderPage() {
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);
  const [seats, setSeats] = useState<{ id: string; station_id: string; label: string; position: number }[]>([]);
  const [stationId, setStationId] = useState<string>("");
  const [seatId, setSeatId] = useState<string>("");
  const [manualSeat, setManualSeat] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("menu_categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").eq("is_available", true).order("name"),
      supabase.from("stations").select("id, name").eq("is_active", true).order("name"),
      supabase.from("station_seats").select("id, station_id, label, position").eq("is_active", true).order("position"),
    ]).then(([c, i, s, se]) => {
      setCats((c.data ?? []) as Cat[]);
      setItems((i.data ?? []) as Item[]);
      setStations((s.data ?? []) as any);
      setSeats((se.data ?? []) as any);
    });
    refreshOrders();
  }, [user]);

  const seatsForStation = seats.filter((s) => s.station_id === stationId);

  function refreshOrders() {
    if (!user) return;
    supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setOrders(data ?? []));
  }

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const it = items.find((i) => i.id === id);
    return sum + (it ? Number(it.price) * qty : 0);
  }, 0);

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const n = { ...c };
      if (qty <= 0) delete n[id]; else n[id] = qty;
      return n;
    });
  }

  async function placeOrder() {
    if (Object.keys(cart).length === 0) { toast({ title: "Сагс хоосон байна", variant: "destructive" }); return; }
    const station = stations.find((s) => s.id === stationId);
    const seat = seats.find((s) => s.id === seatId);
    let label: string | null = null;
    if (manualSeat.trim()) {
      label = manualSeat.trim();
    } else if (station && seat) {
      label = `${station.name} · ${seat.label}`;
    } else if (station && seatsForStation.length === 0) {
      label = station.name;
    }
    if (!label) {
      toast({ title: "Суудлаа сонгоно уу", description: "Хэсэг болон суудлаа сонгох эсвэл суудлын дугаараа бичнэ үү.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("place-order", {
      body: {
        station_id: manualSeat.trim() ? null : stationId || null,
        seat_label: label,
        notes: notes || undefined,
        items: Object.entries(cart).map(([menu_item_id, quantity]) => ({ menu_item_id, quantity })),
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Захиалга амжилтгүй", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Захиалга хүлээж авлаа!", description: `${(data as any).total.toLocaleString("mn-MN")}₮ төлөгдлөө.` });
    setCart({}); setNotes(""); setSeatId(""); setManualSeat("");
    refreshOrders();
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Хоол захиалах</h1>
      <p className="text-muted-foreground mb-6">Халуун рамэн, зууш, ундааг суудал дээр чинь хүргэнэ.</p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-8">
          {cats.map((c) => {
            const list = items.filter((i) => i.category_id === c.id);
            if (!list.length) return null;
            return (
              <div key={c.id}>
                <h2 className="font-display text-xl mb-3 border-l-4 border-primary pl-3">{c.name}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {list.map((it) => {
                    const qty = cart[it.id] ?? 0;
                    return (
                      <Card key={it.id} className="p-4 flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold">{it.name}</p>
                          {it.description && <p className="text-xs text-muted-foreground mt-0.5">{it.description}</p>}
                          <p className="text-sm text-secondary font-bold mt-1">{Number(it.price).toLocaleString("mn-MN")}₮</p>
                        </div>
                        {qty === 0 ? (
                          <Button size="sm" variant="outline" onClick={() => setQty(it.id, 1)}>
                            <Plus className="h-3 w-3" />Нэмэх
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(it.id, qty - 1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-6 text-center">{qty}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(it.id, qty + 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-lg mb-4 flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> Таны сагс</h2>
            {Object.keys(cart).length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">Сагс хоосон байна.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {Object.entries(cart).map(([id, qty]) => {
                  const it = items.find((x) => x.id === id);
                  if (!it) return null;
                  return (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <span>{qty}× {it.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{(Number(it.price) * qty).toLocaleString("mn-MN")}₮</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setQty(id, 0)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3 border-t border-border/40 pt-4">
              <div className="space-y-1">
                <Label>Хүргэх суудал</Label>
                <Select value={stationId} onValueChange={(v) => { setStationId(v); setSeatLabel(""); }}>
                  <SelectTrigger><SelectValue placeholder="Суудал сонгох…" /></SelectTrigger>
                  <SelectContent>{stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-center text-xs text-muted-foreground">— эсвэл —</p>
              <div className="space-y-1">
                <Label>Суудлын дугаар</Label>
                <Input value={seatLabel} onChange={(e) => { setSeatLabel(e.target.value); if (e.target.value) setStationId(""); }} placeholder="ж.нь PC-09" maxLength={50} />
              </div>
              <div className="space-y-1">
                <Label>Тэмдэглэл (заавал биш)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Илүү халуун ногоотой…" />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
              <span className="text-muted-foreground">Нийт</span>
              <span className="font-display text-2xl text-secondary">{Number(total).toLocaleString("mn-MN")}₮</span>
            </div>
            <Button onClick={placeOrder} disabled={busy || total === 0} className="w-full mt-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
              {busy ? "Илгээж байна…" : "Хэтэвчээс төлөх"}
            </Button>
          </Card>

          {orders.length > 0 && (
            <Card className="p-5">
              <h2 className="font-display text-lg mb-3">Сүүлийн захиалгууд</h2>
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="text-sm border-b border-border/40 pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span className="font-mono">#{o.id.slice(0, 6).toUpperCase()}</span>
                      <Badge variant={o.status === "delivered" ? "default" : "outline"} className="capitalize">{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{Number(o.total).toLocaleString("mn-MN")}₮ · {o.order_items?.length} зүйл</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
