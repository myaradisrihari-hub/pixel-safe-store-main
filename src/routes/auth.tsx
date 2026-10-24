import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Loader2, MailCheck, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s) =>
    z.object({
      mode: z.enum(["signin", "signup", "forgot"]).optional(),
      role: z.enum(["buyer", "seller"]).optional(),
      redirect: z.string().optional(),
    }).parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — KnowMarket" },
      { name: "description", content: "Sign in or create your KnowMarket account to buy or sell knowledge products." },
      { property: "og:title", content: "Sign in — KnowMarket" },
      { property: "og:description", content: "Access your KnowMarket account." },
    ],
  }),
  component: AuthPage,
});

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/explore");

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mode = search.mode ?? "signin";
  const [role, setRole] = useState<"buyer" | "seller">(search.role ?? "buyer");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: safe(search.redirect), replace: true });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (form.password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: form.name, intended_role: role } },
        });
        if (error) throw error;
        if (!data.session) setSent("Check your inbox to confirm your email, then sign in.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("If an account exists, a reset link is on its way.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  async function oauth(provider: "google" | "microsoft") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) toast.error(result.error.message);
  }

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden surface-ink lg:block">
        <div className="absolute inset-0 opacity-[0.07] hairline-grid" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo onInk />
          <div>
            <p className="font-display text-4xl font-semibold leading-tight text-ink-foreground">“The best research deserves a market as rigorous as the work itself.”</p>
            <p className="mt-6 text-sm text-ink-muted">One account — buy knowledge, sell knowledge, or both.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? <>Already have one? <Link to="/auth" search={{ ...search, mode: "signin" }} className="font-semibold text-foreground underline">Sign in</Link></>
              : mode === "forgot" ? <>Remembered it? <Link to="/auth" search={{ ...search, mode: "signin" }} className="font-semibold text-foreground underline">Sign in</Link></>
              : <>New to KnowMarket? <Link to="/auth" search={{ ...search, mode: "signup" }} className="font-semibold text-foreground underline">Create an account</Link></>}
          </p>

          {sent ? (
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
              <MailCheck className="mx-auto h-8 w-8 text-gold" />
              <p className="mt-3 text-sm">{sent}</p>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <div className="mt-8 grid gap-2">
                  <Button variant="outline" onClick={() => oauth("google")}>Continue with Google</Button>
                  <Button variant="outline" onClick={() => oauth("microsoft")}>Continue with Microsoft</Button>
                  <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
                </div>
              )}
              <form onSubmit={submit} className={`space-y-4 ${mode === "forgot" ? "mt-8" : ""}`}>
                {mode === "signup" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {([["buyer", BookOpen, "I want to buy"], ["seller", Store, "I want to sell"]] as const).map(([r, Icon, label]) => (
                        <button type="button" key={r} onClick={() => setRole(r)} className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-sm font-medium transition-all ${role === r ? "border-gold bg-gold/10 shadow-soft" : "border-border hover:border-gold/40"}`}>
                          <Icon className="h-4 w-4 text-gold" />{label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  </>
                )}
                <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><Label htmlFor="password">Password</Label>
                      {mode === "signin" && <Link to="/auth" search={{ ...search, mode: "forgot" }} className="text-xs text-muted-foreground hover:text-foreground">Forgot?</Link>}
                    </div>
                    <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                )}
                <Button type="submit" variant="ink" className="w-full" size="lg" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
