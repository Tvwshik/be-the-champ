import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Wallet, Calendar, UtensilsCrossed, ArrowRight } from "lucide-react";

export default function DashboardHome() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("wallet_balance, full_name").eq("id", user.id).single()
      .then(({ data }) => { if (data) { setBalance(Number(data.wallet_balance)); setName(data.full_name ?? ""); } });
    supabase.from("bookings").select("*, stations(name)").eq("user_id", user.id)
      .gte("end_time", new Date().toISOString()).order("start_time").limit(5)
      .then(({ data }) => setBookings(data ?? []));
    supabase.from("orders").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => setOrders(data ?? []));
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Тавтай морил{name ? `, ${name.split(" ")[0]}` : ""} 👋</h1>
      <p className="text-muted-foreground mb-8">Таны гишүүний удирдах төв.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 bg-gradient-to-br from-primary/20 to-secondary/10 border-primary/30 glow-cyan">
          <div className="flex items-center justify-between mb-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground">Хэтэвч</span>
          </div>
          <p className="font-display text-3xl">${balance.toFixed(2)}</p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link to="/dashboard/wallet">Цэнэглэх <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-5 w-5 text-secondary" />
            <span className="text-xs text-muted-foreground">Удахгүй болох захиалга</span>
          </div>
          <p className="font-display text-3xl">{bookings.length}</p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link to="/dashboard/book">Суудал захиалах <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <UtensilsCrossed className="h-5 w-5 text-accent" />
            <span className="text-xs text-muted-foreground">Сүүлийн захиалгууд</span>
          </div>
          <p className="font-display text-3xl">{orders.length}</p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link to="/dashboard/order">Захиалах <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-display text-lg mb-4">Удахгүй болох захиалгууд</h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Удахгүй болох захиалга алга.</p>
          ) : bookings.map((b) => (
            <div key={b.id} className="py-2 border-b border-border/40 last:border-0 flex items-center justify-between">
              <div>
                <p className="font-medium">{b.stations?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-sm font-bold text-secondary">${Number(b.total_cost).toFixed(2)}</span>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg mb-4">Сүүлийн захиалгууд</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Захиалга байхгүй.</p>
          ) : orders.map((o) => (
            <div key={o.id} className="py-2 border-b border-border/40 last:border-0 flex items-center justify-between">
              <div>
                <p className="font-medium">Захиалга #{o.id.slice(0, 6).toUpperCase()}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {o.status.replace("_", " ")} · {new Date(o.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-sm font-bold text-secondary">${Number(o.total).toFixed(2)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
