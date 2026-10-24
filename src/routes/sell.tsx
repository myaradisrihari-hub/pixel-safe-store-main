import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BarChart3, Loader2, Lock, Upload, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth, useRoles } from "@/lib/auth";
import { becomeSeller } from "@/lib/commerce.functions";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell your research & data — KnowMarket" },
      { name: "description", content: "Publish reports, datasets and expert insight on KnowMarket and earn from every sale." },
      { property: "og:title", content: "Sell your research & data — KnowMarket" },
      { property: "og:description", content: "Turn expertise into income with KnowMarket." },
    ],
  }),
  component: SellPage,
});

function SellPage() {
  const { user } = useAuth();
  const { isSeller } = useRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const enable = useServerFn(becomeSeller);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!user) return navigate({ to: "/auth", search: { mode: "signup", role: "seller" } });
    if (isSeller) return navigate({ to: "/dashboard" });
    setBusy(true);
    try {
      await enable();
      await qc.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Seller account enabled");
      navigate({ to: "/dashboard/new" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <section className="relative overflow-hidden surface-ink">
        <div className="absolute inset-0 opacity-[0.07] hairline-grid" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">For researchers, analysts & experts</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-ink-foreground md:text-6xl">Your expertise, <span className="text-gradient-gold">published.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-muted">List reports, datasets and papers in minutes. Set your price, protect your files and get paid for what you know.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button variant="hero" size="lg" onClick={start} disabled={busy}>{busy && <Loader2 className="animate-spin" />}{isSeller ? "Go to dashboard" : "Start selling"} <ArrowRight /></Button>
            <Button asChild variant="onInk" size="lg"><Link to="/explore">See the marketplace</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-20 md:grid-cols-4">
        {[
          { icon: Upload, t: "Upload once", d: "PDF, Office, CSV, JSON, ZIP — up to 100 MB per product." },
          { icon: Lock, t: "Stay protected", d: "Originals stay in private storage; only paying buyers can download." },
          { icon: Wallet, t: "Set your price", d: "Price in rupees and update it whenever you like." },
          { icon: BarChart3, t: "Track earnings", d: "See every order and your running earnings in one place." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <f.icon className="h-6 w-6 text-gold" />
            <h3 className="mt-5 font-semibold">{f.t}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
