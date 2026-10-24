import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/product";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { checkoutCart } from "@/lib/commerce.functions";
import { formatINR } from "@/lib/format";
import { cartQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Checkout — KnowMarket" }, { name: "description", content: "Complete your KnowMarket purchase." }, { property: "og:title", content: "Checkout — KnowMarket" }, { property: "og:description", content: "Secure checkout." }] }),
  component: Checkout,
});

function Checkout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pay = useServerFn(checkoutCart);
  const cart = useQuery(cartQuery(user?.id));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ count: number; total: number } | null>(null);
  const items = cart.data ?? [];
  const total = items.reduce((s, i) => s + Number(i.products?.price ?? 0), 0);

  async function confirm() {
    setBusy(true);
    try {
      const r = await pay();
      setDone(r);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  if (done)
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-gold" />
        <h1 className="mt-6 text-3xl font-semibold">Purchase complete</h1>
        <p className="mt-2 text-muted-foreground">{done.count} product(s) · {formatINR(done.total)} — ready in your library.</p>
        <Button variant="hero" size="lg" className="mt-8" onClick={() => navigate({ to: "/library" })}>Go to library</Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <PageHeader eyebrow="Checkout" title="Review & pay" />
      {cart.isLoading ? <Skeleton className="mt-8 h-64 rounded-2xl" /> : items.length === 0 ? (
        <div className="mt-8"><EmptyState icon={ShoppingBag} title="Nothing to check out" description="Your cart is empty." action={<Button asChild><Link to="/explore">Explore</Link></Button>} /></div>
      ) : (
        <div className="mt-8 rounded-3xl border border-border bg-card p-7 shadow-card">
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between py-3 text-sm"><span className="pr-4">{i.products?.title}</span><span className="font-semibold">{formatINR(i.products?.price ?? 0)}</span></li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-4"><span className="font-semibold">Total</span><span className="font-display text-2xl font-semibold">{formatINR(total)}</span></div>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
            <CreditCard className="h-5 w-5 shrink-0 text-gold" />
            <p><span className="font-semibold">Test payment mode.</span> No card is charged — your order is recorded and access is granted instantly.</p>
          </div>
          <Button variant="hero" size="lg" className="mt-6 w-full" onClick={confirm} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Pay {formatINR(total)}</Button>
        </div>
      )}
    </div>
  );
}
