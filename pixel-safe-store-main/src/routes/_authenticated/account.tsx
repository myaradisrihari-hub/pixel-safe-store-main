import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile, useRoles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Profile — KnowMarket" }, { name: "description", content: "Manage your KnowMarket profile." }, { property: "og:title", content: "Profile — KnowMarket" }, { property: "og:description", content: "Your profile." }] }),
  component: Account,
});

function Account() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { roles } = useRoles();
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", expertise: "", bio: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setF({ full_name: profile.full_name ?? "", expertise: profile.expertise ?? "", bio: profile.bio ?? "" });
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update(f).eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    void qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <PageHeader eyebrow="Account" title="Your profile" description={user?.email}>
        <div className="flex gap-2">{roles.map((r) => <Badge key={r} variant="gold" className="capitalize">{r}</Badge>)}</div>
      </PageHeader>
      <form onSubmit={save} className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-7 shadow-card">
        <div className="space-y-1.5"><Label htmlFor="n">Full name</Label><Input id="n" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} maxLength={100} /></div>
        <div className="space-y-1.5"><Label htmlFor="x">Expertise / domain</Label><Input id="x" placeholder="e.g. Healthcare economics, NLP datasets" value={f.expertise} onChange={(e) => setF({ ...f, expertise: e.target.value })} maxLength={120} /></div>
        <div className="space-y-1.5"><Label htmlFor="b">Bio</Label><Textarea id="b" rows={5} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={1000} /></div>
        <Button variant="ink" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save profile</Button>
      </form>
    </div>
  );
}
