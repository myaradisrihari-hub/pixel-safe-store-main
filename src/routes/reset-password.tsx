import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — KnowMarket" },
      { name: "description", content: "Choose a new password for your KnowMarket account." },
      { property: "og:title", content: "Set a new password — KnowMarket" },
      { property: "og:description", content: "Reset your KnowMarket password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/explore" });
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl border border-border bg-card p-8 shadow-card">
        <KeyRound className="h-7 w-7 text-gold" />
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button className="w-full" variant="ink" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Update password</Button>
      </form>
    </div>
  );
}
