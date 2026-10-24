import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, PackageOpen, UserX } from "lucide-react";

import { EmptyState, ProductCard, ProductGridSkeleton } from "@/components/product";
import { Button } from "@/components/ui/button";
import { formatMonth, initials } from "@/lib/format";
import { sellerPublicQuery } from "@/lib/queries";

export const Route = createFileRoute("/sellers/$id")({
  head: () => ({
    meta: [
      { title: "Seller profile — KnowMarket" },
      { name: "description", content: "Explore this creator's research, datasets and expertise on KnowMarket." },
      { property: "og:title", content: "Seller profile — KnowMarket" },
      { property: "og:description", content: "Knowledge products from an expert creator." },
    ],
  }),
  component: SellerPage,
});

function SellerPage() {
  const { id } = Route.useParams();
  const q = useQuery(sellerPublicQuery(id));

  if (!q.isLoading && !q.data?.profile)
    return <div className="mx-auto max-w-3xl px-6 py-20"><EmptyState icon={UserX} title="Seller not found" description="This profile doesn't exist." action={<Button asChild><Link to="/explore">Explore</Link></Button>} /></div>;

  const profile = q.data?.profile;
  return (
    <div>
      <section className="surface-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-14 md:flex-row md:items-center">
          <span className="grid h-20 w-20 place-items-center rounded-2xl border border-ink-border bg-ink-foreground/5 font-display text-2xl font-bold text-gold">{initials(profile?.full_name)}</span>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-semibold text-ink-foreground">{profile?.full_name || "Seller"}{profile?.is_verified && <BadgeCheck className="h-6 w-6 text-gold" />}</h1>
            <p className="mt-1 text-gold">{profile?.expertise || "Knowledge creator"}</p>
            {profile?.bio && <p className="mt-3 max-w-2xl text-sm text-ink-muted">{profile.bio}</p>}
            <p className="mt-3 text-xs text-ink-muted">Member since {formatMonth(profile?.created_at)}</p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="mb-6 text-xl font-semibold">Products</h2>
        {q.isLoading ? <ProductGridSkeleton count={3} /> : q.data?.products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{q.data.products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
        ) : <EmptyState icon={PackageOpen} title="No products yet" description="This seller hasn't published anything yet." />}
      </div>
    </div>
  );
}
