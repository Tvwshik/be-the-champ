import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Wallet as WalletIcon, Plus, Clock, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState<string>("20");
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => { if (user) loadAll(); }, [user]);

  async function loadAll() {
    if (!user) return;
    const [{ data: p }, { data: r }, { data: t }] = await Promise.all([
      supabase.from("profiles").select("wallet_balance").eq("id", user.id).single(),
      supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (p) setBalance(Number(p.wallet_balance));
    setRequests(r ?? []);
    setTxns(t ?? []);
  }

  async function requestCash() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-topup-request", { body: { amount: amt } });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Request failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Top-up requested", description: `Show code ${(data as any).request.code} to staff.` });
    loadAll();
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Wallet</h1>
      <p className="text-muted-foreground mb-6">Top up online or in store, then spend on bookings & food.</p>

      <Card className="p-6 mb-6 bg-gradient-to-br from-primary/20 to-secondary/10 border-primary/30 glow-cyan">
        <div className="flex items-center gap-3 mb-2">
          <WalletIcon className="h-6 w-6 text-primary" />
          <span className="text-sm text-muted-foreground">Current balance</span>
        </div>
        <p className="font-display text-5xl">${balance.toFixed(2)}</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="font-display text-lg mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Online top-up</h2>
          <p className="text-sm text-muted-foreground mb-4">Pay with card, balance updates instantly.</p>
          <Button disabled className="w-full" variant="outline">
            Coming soon — set up Stripe
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Ask staff to enable card payments in admin.</p>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-secondary" /> Cash top-up at counter</h2>
          <p className="text-sm text-muted-foreground mb-4">Generate a code, pay cash, staff credits your wallet.</p>
          <div className="flex gap-2 mb-3">
            {[10, 20, 50, 100].map((a) => (
              <Button key={a} variant={amount === String(a) ? "default" : "outline"} size="sm" onClick={() => setAmount(String(a))}>${a}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="amt" className="sr-only">Amount</Label>
              <Input id="amt" type="number" min={1} max={1000} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button onClick={requestCash} disabled={busy}>Request</Button>
          </div>
        </Card>
      </div>

      {requests.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="font-display text-lg mb-4">Cash top-up requests</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div>
                  <p className="font-mono text-lg font-bold tracking-widest">{r.code}</p>
                  <p className="text-xs text-muted-foreground">${Number(r.amount).toFixed(2)} · {new Date(r.created_at).toLocaleString()}</p>
                </div>
                <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>
                  {r.status === "approved" && <Check className="h-3 w-3 mr-1" />}
                  {r.status === "rejected" && <X className="h-3 w-3 mr-1" />}
                  {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-display text-lg mb-4">Transaction history</h2>
        {txns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 text-sm">
                <div>
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.type.replace("_", " ")} · {new Date(t.created_at).toLocaleString()}</p>
                </div>
                <span className={`font-bold ${Number(t.amount) >= 0 ? "text-success" : "text-foreground"}`}>
                  {Number(t.amount) >= 0 ? "+" : ""}${Number(t.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
