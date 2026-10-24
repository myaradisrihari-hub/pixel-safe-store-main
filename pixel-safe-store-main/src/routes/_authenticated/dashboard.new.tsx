import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2, Store, UploadCloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { fileExtension, formatBytes, formatINR } from "@/lib/format";
import { categoriesQuery, FILE_FORMATS } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard/new")({
  head: () => ({ meta: [{ title: "Upload a product — KnowMarket" }, { name: "description", content: "Publish a new knowledge product." }, { property: "og:title", content: "Upload a product — KnowMarket" }, { property: "og:description", content: "Seller upload." }] }),
  component: NewProduct,
});

const STEPS = ["Details", "Files", "Pricing"];
const MAX_FILE = 100 * 1024 * 1024;
const MAX_PREVIEW = 25 * 1024 * 1024;
const LICENSES = ["Personal / Academic Use", "Commercial Use", "Creative Commons BY 4.0", "Single Organisation"];

function FileDrop({ label, hint, file, onFile, accept }: { label: string; hint: string; file: File | null; onFile: (f: File | null) => void; accept?: string }) {
  return (
    <label className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${file ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"}`}>
      {file ? <FileUp className="h-8 w-8 text-gold" /> : <UploadCloud className="h-8 w-8 text-muted-foreground" />}
      <p className="mt-3 font-semibold">{file ? file.name : label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{file ? formatBytes(file.size) : hint}</p>
      <input type="file" className="sr-only" accept={accept} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </label>
  );
}

function NewProduct() {
  const { user } = useAuth();
  const { isSeller, isLoading } = useRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const categories = useQuery(categoriesQuery());
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: "", description: "", category_id: "", tags: "", item_count: "", price: "", license: LICENSES[0]! });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);

  if (!isLoading && !isSeller)
    return <div className="mx-auto max-w-3xl px-6 py-20"><EmptyState icon={Store} title="Enable selling first" description="Turn on seller tools to upload products." action={<Button asChild variant="hero"><Link to="/sell">Become a seller</Link></Button>} /></div>;

  const accept = FILE_FORMATS.map((x) => "." + x.toLowerCase()).join(",");

  function validate(): string | null {
    if (step === 0) {
      if (f.title.trim().length < 5) return "Title must be at least 5 characters.";
      if (f.description.trim().length < 30) return "Description must be at least 30 characters.";
      if (!f.category_id) return "Choose a category.";
    }
    if (step === 1) {
      if (!file) return "Upload the product file.";
      if (file.size > MAX_FILE) return "Product file must be under 100 MB.";
      if (!(FILE_FORMATS as readonly string[]).includes(fileExtension(file.name))) return "Unsupported file format.";
      if (preview && preview.size > MAX_PREVIEW) return "Preview must be under 25 MB.";
    }
    if (step === 2) {
      const p = Number(f.price);
      if (!f.price || isNaN(p) || p < 0 || p > 1000000) return "Enter a price between ₹0 and ₹10,00,000.";
    }
    return null;
  }

  function next() {
    const err = validate();
    if (err) return toast.error(err);
    setStep((s) => s + 1);
  }

  async function publish() {
    const err = validate();
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user!.id}/${crypto.randomUUID()}-${safeName(file!.name)}`;
      const up = await supabase.storage.from("product-files").upload(filePath, file!);
      if (up.error) throw up.error;
      let previewPath: string | null = null;
      if (preview) {
        previewPath = `${user!.id}/${crypto.randomUUID()}-${safeName(preview.name)}`;
        const pu = await supabase.storage.from("product-previews").upload(previewPath, preview);
        if (pu.error) throw pu.error;
      }
      const { data, error } = await supabase.from("products").insert({
        seller_id: user!.id,
        title: f.title.trim(),
        description: f.description.trim(),
        category_id: f.category_id,
        tags: f.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10),
        price: Number(f.price),
        license: f.license,
        item_count: f.item_count ? Number(f.item_count) : null,
        file_path: filePath,
        file_name: file!.name,
        file_format: fileExtension(file!.name),
        file_size: file!.size,
        preview_path: previewPath,
        preview_name: preview?.name ?? null,
      }).select("id").single();
      if (error) throw error;
      toast.success("Product published");
      void qc.invalidateQueries({ queryKey: ["products"] });
      navigate({ to: "/product/$id", params: { id: data.id } });
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
      <div className="mt-4"><PageHeader eyebrow="New product" title="Publish knowledge" /></div>

      <ol className="mt-8 flex items-center gap-3">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-3">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${i < step ? "bg-gold text-gold-foreground" : i === step ? "surface-ink text-gold" : "bg-secondary text-muted-foreground"}`}>{i < step ? <Check className="h-4 w-4" /> : i + 1}</span>
            <span className={`text-sm font-medium ${i === step ? "" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-3xl border border-border bg-card p-7 shadow-card">
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-1.5"><Label htmlFor="t">Title</Label><Input id="t" maxLength={150} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="India EV Market Outlook 2026" /></div>
            <div className="space-y-1.5"><Label htmlFor="d">Description</Label><Textarea id="d" rows={6} maxLength={5000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What's inside, methodology, who it's for…" /></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Category</Label>
                <Select value={f.category_id} onValueChange={(v) => setF({ ...f, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="ic">Pages / rows (optional)</Label><Input id="ic" type="number" min={0} value={f.item_count} onChange={(e) => setF({ ...f, item_count: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="tg">Tags</Label><Input id="tg" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="ev, mobility, india (comma separated)" /></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <FileDrop label="Upload product file" hint={`${FILE_FORMATS.join(", ")} · up to 100 MB · kept private`} file={file} onFile={setFile} accept={accept} />
            <FileDrop label="Free sample / preview (optional)" hint="An excerpt buyers can view before purchasing · up to 25 MB" file={preview} onFile={setPreview} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1.5"><Label htmlFor="p">Price (₹)</Label><Input id="p" type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="999" /></div>
            <div className="space-y-1.5"><Label>License</Label>
              <Select value={f.license} onValueChange={(v) => setF({ ...f, license: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LICENSES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-5 text-sm">
              <p className="font-semibold">{f.title || "Untitled"}</p>
              <p className="mt-1 text-muted-foreground">{file?.name} · {formatBytes(file?.size)}{preview ? " · with sample" : ""}</p>
              <p className="mt-3 font-display text-2xl font-semibold">{f.price ? formatINR(Number(f.price)) : "—"}</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || busy}><ArrowLeft /> Back</Button>
          {step < 2 ? <Button variant="ink" onClick={next}>Continue <ArrowRight /></Button> : (
            <Button variant="hero" onClick={publish} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Publish product</Button>
          )}
        </div>
      </div>
    </div>
  );
}
