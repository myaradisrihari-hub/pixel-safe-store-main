import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { EmptyState, PageHeader, ProductCard, ProductGridSkeleton } from "@/components/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoriesQuery, exploreProductsQuery, FILE_FORMATS } from "@/lib/queries";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  format: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  rating: z.number().optional(),
  sort: z.enum(["newest", "popular", "price-asc", "price-desc"]).optional(),
});

export const Route = createFileRoute("/explore")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Explore knowledge products — KnowMarket" },
      { name: "description", content: "Search and filter research reports, datasets, market intelligence and more." },
      { property: "og:title", content: "Explore knowledge products — KnowMarket" },
      { property: "og:description", content: "Search research reports, datasets and expert insight." },
    ],
  }),
  component: Explore,
});

const ALL = "__all";

function Explore() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [text, setText] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const categories = useQuery(categoriesQuery());
  const products = useQuery(
    exploreProductsQuery({
      search: search.q, category: search.category, format: search.format,
      minPrice: search.min, maxPrice: search.max, minRating: search.rating, sort: search.sort,
    }),
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== text) navigate({ search: (s) => ({ ...s, q: text || undefined }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<z.infer<typeof searchSchema>>) => navigate({ search: (s) => ({ ...s, ...patch }) });
  const active = !!(search.category || search.format || search.min || search.max || search.rating || search.q);

  const filters = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
        <div className="flex flex-col gap-1">
          <button onClick={() => set({ category: undefined })} className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${!search.category ? "bg-secondary font-semibold" : "hover:bg-secondary/60"}`}>All categories</button>
          {(categories.data ?? []).map((c) => (
            <button key={c.id} onClick={() => set({ category: c.slug })} className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${search.category === c.slug ? "bg-secondary font-semibold" : "hover:bg-secondary/60"}`}>{c.name}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Format</p>
        <Select value={search.format ?? ALL} onValueChange={(v) => set({ format: v === ALL ? undefined : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any format</SelectItem>
            {FILE_FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price (₹)</p>
        <div className="flex gap-2">
          <Input type="number" min={0} placeholder="Min" defaultValue={search.min} onBlur={(e) => set({ min: e.target.value ? Number(e.target.value) : undefined })} />
          <Input type="number" min={0} placeholder="Max" defaultValue={search.max} onBlur={(e) => set({ max: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</p>
        <div className="flex flex-wrap gap-2">
          {[undefined, 3, 4, 4.5].map((r) => (
            <button key={String(r)} onClick={() => set({ rating: r })} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${search.rating === r ? "border-gold bg-gold/15" : "border-border hover:border-gold/50"}`}>{r ? `${r}★ & up` : "Any"}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <PageHeader eyebrow="Marketplace" title="Explore knowledge" description="Reports, datasets and expert analysis from creators across every discipline.">
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search titles…" className="w-full md:w-72" />
          <Select value={search.sort ?? "newest"} onValueChange={(v) => set({ sort: v as "newest" })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most popular</SelectItem>
              <SelectItem value="price-asc">Price: low to high</SelectItem>
              <SelectItem value="price-desc">Price: high to low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        <div>
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{products.data ? `${products.data.length} results` : "Loading…"}</p>
            <div className="flex gap-2">
              {active && <Button variant="ghost" size="sm" onClick={() => { setText(""); navigate({ search: {} }); }}><X /> Clear</Button>}
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters((v) => !v)}><SlidersHorizontal /> Filters</Button>
            </div>
          </div>
          {showFilters && <div className="mb-6 rounded-2xl border border-border bg-card p-5 lg:hidden">{filters}</div>}
          {products.isLoading ? <ProductGridSkeleton /> : products.isError ? (
            <EmptyState icon={SearchX} title="Couldn't load products" description="Please check your connection and try again." action={<Button onClick={() => products.refetch()}>Retry</Button>} />
          ) : products.data?.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.data.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          ) : (
            <EmptyState icon={SearchX} title="No matches yet" description="Try a broader search or remove a few filters." />
          )}
        </div>
      </div>
    </div>
  );
}
