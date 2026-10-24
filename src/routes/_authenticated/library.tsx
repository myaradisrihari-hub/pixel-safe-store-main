import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Library, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, FileBadge, PageHeader, ProductCover } from "@/components/product";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { getProductDownloadUrl } from "@/lib/downloads.functions";
import { formatDate, formatINR } from "@/lib/format";
import { purchasesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "My library — KnowMarket" }, { name: "description", content: "Download your purchased knowledge products." }, { property: "og:title", content: "My library — KnowMarket" }, { property: "og:description", content: "Your purchases." }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const q = useQuery(purchasesQuery(user?.id));
  const dl = useServerFn(getProductDownloadUrl);
  const [busy, setBusy] = useState<string | null>(null);
  const rows = q.data ?? [];
  const spent = rows.reduce((s, r) => s + Number(r.price), 0);

  async function download(productId: string) {
    setBusy(productId);
    try {
      const { url } = await dl({ data: { productId } });
      window.location.href = url;
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader eyebrow="Library" title="Your knowledge library" description={rows.length ? `${rows.length} purchase(s) · ${formatINR(spent)} invested` : undefined} />
      <div className="mt-8">
        {q.isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div> : rows.length === 0 ? (
          <EmptyState icon={Library} title="No purchases yet" description="Products you buy appear here, ready to download anytime." action={<Button asChild variant="hero"><Link to="/explore">Start exploring</Link></Button>} />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => r.products && (
              <div key={r.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center">
                <ProductCover product={r.products} className="h-20 w-full shrink-0 rounded-xl sm:w-28" />
                <div className="min-w-0 flex-1">
                  <Link to="/product/$id" params={{ id: r.product_id }} className="line-clamp-1 font-semibold hover:underline">{r.products.title}</Link>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><FileBadge format={r.products.file_format} /> Purchased {formatDate(r.created_at)} · {formatINR(r.price)}</div>
                </div>
                <Button variant="ink" onClick={() => download(r.product_id)} disabled={busy === r.product_id}>{busy === r.product_id ? <Loader2 className="animate-spin" /> : <Download />} Download</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
