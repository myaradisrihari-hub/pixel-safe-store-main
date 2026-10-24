import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowRight, BarChart3, Brain, BookOpen, Briefcase, Cpu, Database, FlaskConical, GraduationCap,
  HeartPulse, Landmark, Lock, Megaphone, Search, ShieldCheck, Sprout, Upload, Wallet, Wrench, type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import heroImg from "@/assets/hero-knowledge.jpg";
import { EmptyState, ProductCard, ProductGridSkeleton } from "@/components/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoriesQuery, featuredProductsQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KnowMarket — Buy & sell research, datasets and expert insight" },
      { name: "description", content: "A premium marketplace where researchers, analysts and experts sell reports, datasets and knowledge products to students, startups and businesses." },
      { property: "og:title", content: "KnowMarket — Knowledge, fairly traded" },
      { property: "og:description", content: "Discover research reports, datasets and expert insight from verified creators." },
    ],
  }),
  component: Home,
});

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "ai-machine-learning": Brain, technology: Cpu, business: Briefcase, finance: Landmark,
  healthcare: HeartPulse, agriculture: Sprout, education: GraduationCap, marketing: Megaphone,
  research: FlaskConical, "market-intelligence": BarChart3, datasets: Database, "technical-resources": Wrench,
};

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const categories = useQuery(categoriesQuery());
  const featured = useQuery(featuredProductsQuery());

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden surface-ink">
        <div className="absolute inset-0 opacity-[0.07] hairline-grid" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-ink-border px-3 py-1 text-xs font-medium text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> The knowledge economy, organised
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] text-ink-foreground sm:text-5xl lg:text-6xl">
              Research worth <span className="text-gradient-gold">paying for.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-muted">
              Reports, datasets and expert analysis — sold directly by the researchers and analysts who made them.
            </p>
            <form
              className="mt-8 flex max-w-xl gap-2 rounded-xl border border-ink-border bg-ink-foreground/5 p-1.5 backdrop-blur"
              onSubmit={(e) => { e.preventDefault(); navigate({ to: "/explore", search: { q: q || undefined } }); }}
            >
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-4 w-4 text-ink-muted" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports, datasets, topics…" className="border-0 bg-transparent text-ink-foreground shadow-none placeholder:text-ink-muted focus-visible:ring-0" />
              </div>
              <Button type="submit" variant="hero">Search</Button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="onInk"><Link to="/explore">Browse marketplace <ArrowRight /></Link></Button>
              <Button asChild variant="onInk"><Link to="/sell">Sell your research</Link></Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }} className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gold/10 blur-3xl" />
            <img src={heroImg} alt="Abstract illustration of structured knowledge" width={1024} height={1024} className="relative aspect-[4/3] w-full rounded-3xl border border-ink-border object-cover shadow-lift" />
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Categories</p>
            <h2 className="mt-2 text-3xl font-semibold">Explore by discipline</h2>
          </div>
          <Link to="/explore" className="hidden text-sm font-semibold hover:text-gold sm:inline-flex">View all →</Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(categories.data ?? []).map((c, i) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? BookOpen;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <Link to="/explore" search={{ category: c.slug }} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-card">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary transition-colors group-hover:bg-gold/15">
                    <Icon className="h-5 w-5 text-foreground" />
                  </span>
                  <span className="text-sm font-semibold">{c.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Trending</p>
        <h2 className="mt-2 text-3xl font-semibold">Most acquired knowledge</h2>
        <div className="mt-10">
          {featured.isLoading ? <ProductGridSkeleton /> : featured.data?.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.data.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          ) : (
            <EmptyState icon={Upload} title="The shelves are waiting" description="No products have been published yet. Be the first expert to list your research on KnowMarket." action={<Button asChild variant="hero"><Link to="/sell">Start selling</Link></Button>} />
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Search, title: "Discover", text: "Filter by discipline, format, price and rating. Preview samples before you commit." },
            { icon: Lock, title: "Acquire securely", text: "Files live in private storage. Only verified buyers receive short-lived download links." },
            { icon: Wallet, title: "Creators earn", text: "Sellers set their own price and track every sale from a dedicated dashboard." },
          ].map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-7 shadow-soft">
              <div className="flex items-center justify-between">
                <s.icon className="h-6 w-6 text-gold" />
                <span className="font-display text-sm text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-16 overflow-hidden rounded-3xl surface-ink p-10 md:p-14">
          <div className="absolute inset-0 opacity-[0.07] hairline-grid" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <ShieldCheck className="h-8 w-8 text-gold" />
              <h2 className="mt-4 text-3xl font-semibold text-ink-foreground">Turn your expertise into income.</h2>
              <p className="mt-2 max-w-lg text-ink-muted">List reports, datasets and papers in minutes. You keep ownership — we handle delivery.</p>
            </div>
            <Button asChild variant="hero" size="lg"><Link to="/sell">Become a seller <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
