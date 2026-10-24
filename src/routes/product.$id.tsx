import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Calendar, Download, Eye, FileText, Layers, Loader2, Scale, ShieldCheck, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, FileBadge, ProductCover, Rating } from "@/components/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getPreviewUrl, getProductDownloadUrl } from "@/lib/downloads.functions";
import { formatBytes, formatDate, formatINR, initials } from "@/lib/format";
import { productQuery } from "@/lib/queries";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Knowledge product — KnowMarket" },
      { name: "description", content: "View details, preview a sample and purchase this knowledge product on KnowMarket." },
      { property: "og:title", content: "Knowledge product — KnowMarket" },
      { property: "og:description", content: "Research, data and expert insight on KnowMarket." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const product = useQuery(productQuery(id));
  const previewFn = useServerFn(getPreviewUrl);
  const downloadFn = useServerFn(getProductDownloadUrl);
  const [busy, setBusy] = useState<string | null>(null);

  const owned = useQuery({
    queryKey: ["owned", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_purchased", { _user_id: user!.id, _product_id: id });
      return data === true;
    },
  });
  const inCart = useQuery({
    queryKey: ["in-cart", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("cart_items").select("id").eq("user_id", user!.id).eq("product_id", id).maybeSingle();
      return !!data;
    },
  });

  if (product.isLoading)
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  const p = product.data;
  if (!p)
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <EmptyState icon={FileText} title="Product not found" description="It may have been removed or is not published yet." action={<Button asChild><Link to="/explore">Back to explore</Link></Button>} />
      </div>
    );

  const isOwner = user?.id === p.seller_id;

  async function addToCart(goToCart = false) {
    if (!user) return navigate({ to: "/auth", search: { redirect: `/product/${id}` } });
    setBusy(goToCart ? "buy" : "cart");
    const { error } = await supabase.from("cart_items").upsert({ user_id: user.id, product_id: id }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
    setBusy(null);
    if (error) return toast.error("Could not add to cart", { description: error.message });
    void qc.invalidateQueries({ queryKey: ["cart-count"] });
    void qc.invalidateQueries({ queryKey: ["in-cart", id] });
    if (goToCart) navigate({ to: "/checkout" });
    else toast.success("Added to cart");
  }

  async function openPreview() {
    setBusy("preview");
    try {
      const { url } = await previewFn({ data: { previewPath: p!.preview_path! } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  }

  async function download() {
    setBusy("download");
    try {
      const { url } = await downloadFn({ data: { productId: id } });
      window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  }

  const specs = [
    { icon: FileText, label: "Format", value: p.file_format ?? "—" },
    { icon: Layers, label: "Size", value: formatBytes(p.file_size) },
    { icon: Calendar, label: "Published", value: formatDate(p.created_at) },
    { icon: Scale, label: "License", value: p.license },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/explore" className="hover:text-foreground">Explore</Link>
        {p.categories && (<> / <Link to="/explore" search={{ category: p.categories.slug }} className="hover:text-foreground">{p.categories.name}</Link></>)}
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <ProductCover product={p} className="h-56 rounded-3xl shadow-card md:h-72" />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <FileBadge format={p.file_format} />
            <Rating value={p.rating} count={p.rating_count} />
            <span className="text-xs text-muted-foreground">{p.purchases_count} purchases</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">{p.title}</h1>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{p.description}</p>
          {p.tags?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {p.tags.map((t) => <Badge key={t} variant="secondary">#{t}</Badge>)}
            </div>
          )}
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {specs.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <s.icon className="h-4 w-4 text-gold" />
                <p className="mt-3 text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 text-sm font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-7 shadow-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Price</p>
            <p className="mt-1 font-display text-4xl font-semibold">{formatINR(p.price)}</p>
            <div className="mt-6 space-y-2.5">
              {isOwner ? (
                <>
                  <Button className="w-full" variant="ink" size="lg" onClick={download} disabled={busy === "download"}>{busy === "download" ? <Loader2 className="animate-spin" /> : <Download />} Download your file</Button>
                  <Button asChild className="w-full" variant="outline"><Link to="/dashboard">Manage in dashboard</Link></Button>
                </>
              ) : owned.data ? (
                <Button className="w-full" variant="hero" size="lg" onClick={download} disabled={busy === "download"}>{busy === "download" ? <Loader2 className="animate-spin" /> : <Download />} Download</Button>
              ) : (
                <>
                  <Button className="w-full" variant="hero" size="lg" onClick={() => addToCart(true)} disabled={!!busy}>{busy === "buy" && <Loader2 className="animate-spin" />} Buy now</Button>
                  {inCart.data ? (
                    <Button asChild className="w-full" variant="outline"><Link to="/cart"><ShoppingBag /> In your cart</Link></Button>
                  ) : (
                    <Button className="w-full" variant="outline" onClick={() => addToCart(false)} disabled={!!busy}>{busy === "cart" ? <Loader2 className="animate-spin" /> : <ShoppingBag />} Add to cart</Button>
                  )}
                </>
              )}
              {p.preview_path && (
                <Button className="w-full" variant="ghost" onClick={openPreview} disabled={busy === "preview"}>{busy === "preview" ? <Loader2 className="animate-spin" /> : <Eye />} View free sample</Button>
              )}
            </div>
            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-gold" /> Instant access after purchase. Files are delivered through secure, expiring links.</p>
          </div>

          {p.profiles && (
            <Link to="/sellers/$id" params={{ id: p.profiles.id }} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 transition-colors hover:border-gold/50">
              <span className="grid h-12 w-12 place-items-center rounded-full surface-ink text-sm font-bold text-gold">{initials(p.profiles.full_name)}</span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-semibold">{p.profiles.full_name || "Seller"}{p.profiles.is_verified && <BadgeCheck className="h-4 w-4 text-gold" />}</p>
                <p className="truncate text-xs text-muted-foreground">{p.profiles.expertise || "Knowledge creator"}</p>
              </div>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
