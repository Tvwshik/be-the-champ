import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).single()
      .then(({ data }) => { if (data) { setFullName(data.full_name ?? ""); setPhone(data.phone ?? ""); } });
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    setBusy(false);
    if (error) toast({ title: "Хадгалах амжилтгүй", description: error.message, variant: "destructive" });
    else toast({ title: "Профайл хадгалагдлаа" });
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Профайл</h1>
      <Card className="p-6 max-w-xl space-y-4">
        <div className="space-y-2">
          <Label>И-мэйл</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>Бүтэн нэр</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label>Утас</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
        </div>
        <Button onClick={save} disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
      </Card>
    </div>
  );
}
