import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminPage() {
  const [tab, setTab] = useState("orders");

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl mb-2">Staff Admin</h1>
      <p className="text-muted-foreground mb-6">Manage orders, bookings, top-ups, members and menu.</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="orders">Orders queue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="topups">Top-up requests</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersQueue /></TabsContent>
        <TabsContent value="bookings"><BookingsAdmin /></TabsContent>
        <TabsContent value="topups"><TopupsAdmin /></TabsContent>
        <TabsContent value="members"><MembersAdmin /></TabsContent>
        <TabsContent value="menu"><MenuAdmin /></TabsContent>
        <TabsContent value="stations"><StationsAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

function OrdersQueue() {
  const [orders, setOrders] = useState<any[]>([]);
  const load = () => supabase.from("orders").select("*, order_items(*), profiles(full_name), stations(name)")
    .in("status", ["received", "preparing"]).order("created_at").then(({ data }) => setOrders(data ?? []));
  useEffect(() => { load(); const t = setInterval(load, 10_000); return () => clearInterval(t); }, []);
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Order ${status}` }); load(); }
  };
  return (
    <Card className="p-5 mt-4">
      {orders.length === 0 ? <p className="text-sm text-muted-foreground">No active orders.</p> : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border border-border/40 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2 gap-3">
                <div>
                  <p className="font-semibold">#{o.id.slice(0, 6).toUpperCase()} · {o.profiles?.full_name ?? "Member"}</p>
                  <p className="text-xs text-muted-foreground">Seat: {o.stations?.name ?? o.seat_label ?? "—"} · ${Number(o.total).toFixed(2)} · {new Date(o.created_at).toLocaleTimeString()}</p>
                </div>
                <Badge variant={o.status === "received" ? "outline" : "default"}>{o.status}</Badge>
              </div>
              <ul className="text-sm mb-3 ml-4 list-disc">
                {o.order_items.map((i: any) => <li key={i.id}>{i.quantity}× {i.name}</li>)}
              </ul>
              {o.notes && <p className="text-xs text-muted-foreground italic mb-2">Note: {o.notes}</p>}
              <div className="flex gap-2 flex-wrap">
                {o.status === "received" && <Button size="sm" onClick={() => setStatus(o.id, "preparing")}>Start preparing</Button>}
                {o.status === "preparing" && <Button size="sm" onClick={() => setStatus(o.id, "delivered")}>Mark delivered</Button>}
                <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "cancelled")}>Cancel</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BookingsAdmin() {
  const [bookings, setBookings] = useState<any[]>([]);
  const load = () => supabase.from("bookings").select("*, stations(name), profiles(full_name)")
    .gte("end_time", new Date(Date.now() - 86400000).toISOString())
    .order("start_time").then(({ data }) => setBookings(data ?? []));
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", id);
    toast({ title: `Booking ${status}` }); load();
  };
  return (
    <Card className="p-5 mt-4">
      {bookings.length === 0 ? <p className="text-sm text-muted-foreground">No bookings.</p> : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 p-3 border border-border/40 rounded-md flex-wrap">
              <div>
                <p className="font-semibold">{b.stations?.name} · {b.profiles?.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString()} · ${Number(b.total_cost).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{b.status}</Badge>
                {b.status === "confirmed" && <Button size="sm" onClick={() => setStatus(b.id, "checked_in")}>Check in</Button>}
                {b.status === "checked_in" && <Button size="sm" onClick={() => setStatus(b.id, "completed")}>Complete</Button>}
                {b.status !== "cancelled" && b.status !== "completed" && <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "cancelled")}>Cancel</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TopupsAdmin() {
  const [reqs, setReqs] = useState<any[]>([]);
  const load = () => supabase.from("topup_requests").select("*, profiles(full_name)").eq("status", "pending")
    .order("created_at").then(({ data }) => setReqs(data ?? []));
  useEffect(() => { load(); }, []);
  const resolve = async (id: string, action: "approve" | "reject") => {
    const { error, data } = await supabase.functions.invoke("resolve-topup", { body: { request_id: id, action } });
    if (error || (data as any)?.error) toast({ title: "Failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    else { toast({ title: `Top-up ${action}d` }); load(); }
  };
  return (
    <Card className="p-5 mt-4">
      {reqs.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : (
        <div className="space-y-2">
          {reqs.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 border border-border/40 rounded-md">
              <div>
                <p className="font-mono font-bold tracking-widest">{r.code}</p>
                <p className="text-xs text-muted-foreground">{r.profiles?.full_name ?? "Member"} · ${Number(r.amount).toFixed(2)} · {new Date(r.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => resolve(r.id, "approve")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => resolve(r.id, "reject")}>Reject</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MembersAdmin() {
  const [members, setMembers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [adjUser, setAdjUser] = useState<string>("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("In-store cash top-up");
  const load = () => {
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
    if (q) query = query.ilike("full_name", `%${q}%`);
    query.then(({ data }) => setMembers(data ?? []));
  };
  useEffect(() => { load(); }, [q]);
  const adjust = async () => {
    const amt = Number(adjAmount);
    if (!adjUser || !amt) return;
    const { data, error } = await supabase.functions.invoke("staff-adjust-wallet", {
      body: { user_id: adjUser, amount: amt, description: adjDesc },
    });
    if (error || (data as any)?.error) toast({ title: "Failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    else { toast({ title: "Wallet updated", description: `New balance: $${(data as any).balance.toFixed(2)}` }); setAdjAmount(""); load(); }
  };
  return (
    <div className="mt-4 space-y-4">
      <Card className="p-5">
        <h3 className="font-display text-lg mb-3">Adjust wallet (cash top-up / refund)</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <Label>Member</Label>
            <Select value={adjUser} onValueChange={setAdjUser}>
              <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id.slice(0, 8)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Amount (+/-)</Label><Input type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} /></div>
          <div><Label>Description</Label><Input value={adjDesc} onChange={(e) => setAdjDesc(e.target.value)} /></div>
          <Button onClick={adjust} className="self-end">Apply</Button>
        </div>
      </Card>
      <Card className="p-5">
        <Input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm" />
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-2 border-b border-border/40 last:border-0">
              <div>
                <p className="font-semibold">{m.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{m.phone ?? "no phone"} · joined {new Date(m.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-secondary">${Number(m.wallet_balance).toFixed(2)}</p>
                {m.is_suspended && <Badge variant="destructive">Suspended</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MenuAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [name, setName] = useState(""); const [price, setPrice] = useState(""); const [catId, setCatId] = useState("");
  const load = () => {
    supabase.from("menu_items").select("*").order("name").then(({ data }) => setItems(data ?? []));
    supabase.from("menu_categories").select("*").order("sort_order").then(({ data }) => setCats(data ?? []));
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!name || !price || !catId) return;
    const { error } = await supabase.from("menu_items").insert({ name, price: Number(price), category_id: catId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setName(""); setPrice(""); load(); }
  };
  const toggle = async (id: string, available: boolean) => {
    await supabase.from("menu_items").update({ is_available: !available }).eq("id", id); load();
  };
  const del = async (id: string) => { await supabase.from("menu_items").delete().eq("id", id); load(); };
  return (
    <div className="mt-4 space-y-4">
      <Card className="p-5">
        <h3 className="font-display text-lg mb-3">Add menu item</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Select value={catId} onValueChange={setCatId}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add}>Add</Button>
        </div>
      </Card>
      <Card className="p-5">
        <div className="space-y-1">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between p-2 border-b border-border/40 last:border-0">
              <div>
                <p className="font-semibold">{it.name}</p>
                <p className="text-xs text-muted-foreground">${Number(it.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={it.is_available ? "default" : "outline"}>{it.is_available ? "available" : "off"}</Badge>
                <Button size="sm" variant="outline" onClick={() => toggle(it.id, it.is_available)}>{it.is_available ? "Disable" : "Enable"}</Button>
                <Button size="sm" variant="ghost" onClick={() => del(it.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StationsAdmin() {
  const [stations, setStations] = useState<any[]>([]);
  const load = () => supabase.from("stations").select("*").order("name").then(({ data }) => setStations(data ?? []));
  useEffect(() => { load(); }, []);
  const toggle = async (id: string, active: boolean) => {
    await supabase.from("stations").update({ is_active: !active }).eq("id", id); load();
  };
  return (
    <Card className="p-5 mt-4">
      <p className="text-sm text-muted-foreground mb-3">Stations are seeded — toggle availability here.</p>
      <div className="space-y-1">
        {stations.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-2 border-b border-border/40 last:border-0">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.type} · ${Number(s.hourly_rate).toFixed(2)}/h · seats {s.capacity}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={s.is_active ? "default" : "outline"}>{s.is_active ? "active" : "off"}</Badge>
              <Button size="sm" variant="outline" onClick={() => toggle(s.id, s.is_active)}>{s.is_active ? "Disable" : "Enable"}</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
