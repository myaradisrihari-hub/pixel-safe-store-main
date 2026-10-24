import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Package, Pencil, Plus, Receipt, Store, Trash2, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, FileBadge, PageHeader } from "@/components/product";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { salesQuery, sellerProductsQuery, type ProductRow } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Seller dashboard — KnowMarket" }, { name: "description", content: "Manage your products, orders and earnings." }, { property: "og:title", content: "Seller dashboard — KnowMarket" }, { property: "og:description", content: "Seller tools." }] }),
  component: Dashboard,
});

const STATUS: Record<string, "verified" | "secondary" | "destructive"> = { published: "verified", pending: "secondary", rejected: "destructive" };

function Dashboard() {
  const { user } = useAuth();
  const { isSeller, isLoading } = useRoles();
  const qc = useQueryClient();
  const products = useQuery(sellerProductsQuery(user?.id));
  const sales = useQuery(salesQuery(user?.id));
  const [edit, setEdit] = useState<ProductRow | null>(null);

  if (isLoading) return <div className="mx-auto max-w-6xl px-6 py-12"><Skeleton className="h-40 rounded-2xl" /></div>;
  if (!isSeller)
    return <div className="mx-auto max-w-3xl px-6 py-20"><EmptyState icon={Store} title="Seller tools aren't on yet" description="Enable selling on your account to publish products." action={<Button asChild variant="hero"><Link to="/sell">Become a seller</Link></Button>} /></div>;

  const saleRows = sales.data ?? [];
  const earnings = saleRows.reduce((s, r) => s + Number(r.price), 0);
  const stats = [
    { icon: Wallet, label: "Total earnings", value: formatINR(earnings) },
    { icon: Receipt, label: "Orders", value: String(saleRows.length) },
    { icon: Package, label: "Products", value: String(products.data?.length ?? 0) },
    { icon: TrendingUp, label: "This month", value: formatINR(saleRows.filter((r) => new Date(r.created_at).getMonth() === new Date().getMonth() && new Date(r.created_at).getFullYear() === new Date().getFullYear()).reduce((s, r) => s + Number(r.price), 0)) },
  ];

  async function remove(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error("Can't delete a product that has been purchased. Edit it instead.");
    toast.success("Product deleted");
    void qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader eyebrow="Seller" title="Dashboard" description="Your products, orders and earnings at a glance.">
        <Button asChild variant="hero"><Link to="/dashboard/new"><Plus /> New product</Link></Button>
      </PageHeader>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <s.icon className="h-5 w-5 text-gold" />
            <p className="mt-4 text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="products" className="mt-10">
        <TabsList><TabsTrigger value="products">Products</TabsTrigger><TabsTrigger value="orders">Orders</TabsTrigger></TabsList>
        <TabsContent value="products" className="mt-6">
          {products.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : !products.data?.length ? (
            <EmptyState icon={Package} title="No products yet" description="Upload your first report, dataset or paper." action={<Button asChild variant="hero"><Link to="/dashboard/new"><Plus /> Upload product</Link></Button>} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {products.data.map((p) => (
                <div key={p.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-1 font-semibold hover:underline">{p.title}</Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <FileBadge format={p.file_format} /> {p.categories?.name} · {formatDate(p.created_at)} · {p.purchases_count} sold
                    </div>
                  </div>
                  <Badge variant={STATUS[p.status] ?? "secondary"} className="w-fit capitalize">{p.status}</Badge>
                  <span className="w-24 font-display font-semibold sm:text-right">{formatINR(p.price)}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEdit(p)} aria-label="Edit"><Pencil /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label="Delete"><Trash2 /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete this product?</AlertDialogTitle><AlertDialogDescription>It will be removed from the marketplace.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(p.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          {sales.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : !saleRows.length ? (
            <EmptyState icon={Receipt} title="No orders yet" description="Sales of your products will appear here." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {saleRows.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 border-b border-border p-4 text-sm last:border-0">
                  <div className="min-w-0"><p className="truncate font-medium">{s.products?.title}</p><p className="text-xs text-muted-foreground">{formatDate(s.created_at)}</p></div>
                  <span className="font-display font-semibold">{formatINR(s.price)}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {edit && <EditDialog product={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditDialog({ product, onClose }: { product: ProductRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: product.title, description: product.description, price: String(product.price) });
  const [busy, setBusy] = useState(false);
  async function save() {
    const price = Number(f.price);
    if (!f.title.trim() || isNaN(price) || price < 0) return toast.error("Enter a valid title and price.");
    setBusy(true);
    const { error } = await supabase.from("products").update({ title: f.title.trim(), description: f.description, price }).eq("id", product.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Product updated");
    void qc.invalidateQueries({ queryKey: ["products"] });
    void qc.invalidateQueries({ queryKey: ["product", product.id] });
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="ink" onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
