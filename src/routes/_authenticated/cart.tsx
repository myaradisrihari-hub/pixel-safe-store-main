import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, FileBadge, PageHeader, ProductCover } from "@/components/product";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { cartQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({ meta: [{ title: "Your cart — KnowMarket" }, { name: "description", content: "Review the knowledge products in your cart." }, { property: "og:title", content: "Your cart — KnowMarket" }, { property: "og:description", content: "Your KnowMarket cart." }] }),
  component: CartPage,
});

function CartPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const cart = useQuery(cartQuery(user?.id));
  const items = cart.data ?? [];
  const total = items.reduce((s, i) => s + Number(i.products?.price ?? 0), 0);

  async function remove(id: string) {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["cart"] });
    void qc.invalidateQueries({ queryKey: ["cart-count"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader eyebrow="Cart" title="Your cart" />
      <div className="mt-8">
        {cart.isLoading ? <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div> : items.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Find research and datasets worth adding." action={<Button asChild variant="hero"><Link to="/explore">Explore products</Link></Button>} />
        ) : (
          <div className="grid gap-8 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {items.map((i) => i.products && (
                <div key={i.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <ProductCover product={i.products} className="h-20 w-28 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Link to="/product/$id" params={{ id: i.product_id }} className="line-clamp-1 font-semibold hover:underline">{i.products.title}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{i.products.profiles?.full_name}</p>
                    <div className="mt-2"><FileBadge format={i.products.file_format} /></div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <span className="font-display font-semibold">{formatINR(i.products.price)}</span>
                    <Button variant="ghost" size="icon" onClick={() => remove(i.id)} aria-label="Remove"><Trash2 /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{items.length} item(s)</span><span>{formatINR(total)}</span></div>
              <div className="mt-4 flex justify-between border-t border-border pt-4 font-semibold"><span>Total</span><span className="font-display text-xl">{formatINR(total)}</span></div>
              <Button asChild variant="hero" size="lg" className="mt-6 w-full"><Link to="/checkout">Checkout <ArrowRight /></Link></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
