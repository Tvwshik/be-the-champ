import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  full_name: z.string().trim().min(1).max(100).optional(),
});

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const next = params.get("next") || "/dashboard";
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, navigate, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, full_name: mode === "signup" ? fullName : undefined });
    if (!parsed.success) {
      toast({ title: "Check your input", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${next}`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast({ title: "Welcome to Be The Champ!", description: "Account created." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Logged in", description: "Game on." });
      }
      navigate(next, { replace: true });
    } catch (err: any) {
      toast({ title: "Auth error", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + next });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: String((result.error as any).message ?? result.error), variant: "destructive" });
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate(next, { replace: true });
  }

  return (
    <div className="container py-16 md:py-24 flex justify-center">
      <Card className="w-full max-w-md p-8 bg-card/80 border-border/60 backdrop-blur">
        <div className="flex flex-col items-center mb-6">
          <Trophy className="h-10 w-10 text-primary mb-2" />
          <h1 className="font-display text-2xl">{mode === "login" ? "Welcome back" : "Join the Champs"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Sign in to your member account" : "Create your member account"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} />
          </div>

          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={googleSignIn} disabled={busy}>
          Continue with Google
        </Button>

        <p className="text-sm text-center text-muted-foreground mt-6">
          {mode === "login" ? "New here?" : "Already a member?"}{" "}
          <button className="text-primary hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-3">
          <Link to="/" className="hover:text-foreground">← Back home</Link>
        </p>
      </Card>
    </div>
  );
}
