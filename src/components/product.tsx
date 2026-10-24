import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BadgeCheck, Download, FileText, Star, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format";
import type { ProductRow } from "@/lib/queries";

export function FileBadge({ format }: { format?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
      <FileText className="h-3 w-3" />
      {format || "FILE"}
    </span>
  );
}

export function Rating({ value, count }: { value: number; count: number }) {
  if (!count) return <span className="text-xs text-muted-foreground">New</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium">
      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
      {Number(value).toFixed(1)} <span className="text-muted-foreground">({count})</span>
    </span>
  );
}

/** Generative cover so every product has a distinctive tile without mock imagery. */
export function ProductCover({ product, className = "" }: { product: ProductRow; className?: string }) {
  const seed = [...product.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = seed % 360;
  return (
    <div className={`relative overflow-hidden surface-ink ${className}`}>
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: `conic-gradient(from ${angle}deg at 70% 30%, transparent, oklch(0.755 0.128 72 / 0.35), transparent 40%)` }} />
      <div className="absolute inset-0 hairline-grid opacity-40" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{product.categories?.name ?? "Knowledge"}</span>
        <span className="font-display text-4xl font-bold text-ink-foreground/15">{product.file_format ?? "DOC"}</span>
      </div>
    </div>
  );
}

export function ProductCard({ product, index = 0 }: { product: ProductRow; index?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04 }}>
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-lift"
      >
        <ProductCover product={product} className="h-36" />
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <FileBadge format={product.file_format} />
            <Rating value={product.rating} count={product.rating_count} />
          </div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-foreground">{product.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-xs font-medium">
                {product.profiles?.full_name || "Seller"}
                {product.profiles?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-gold" />}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Download className="h-3 w-3" /> {product.purchases_count} sold
              </p>
            </div>
            <span className="font-display text-lg font-semibold">{formatINR(product.price)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skeleton className="h-36 rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl surface-ink shadow-soft">
        <Icon className="h-6 w-6 text-gold" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string | undefined; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
