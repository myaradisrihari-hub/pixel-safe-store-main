import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, LayoutDashboard, LogOut, Menu, ShoppingBag, User } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile, useRoles } from "@/lib/auth";
import { initials } from "@/lib/format";

export function Logo({ onInk = false }: { onInk?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="relative grid h-8 w-8 place-items-center rounded-lg surface-ink shadow-soft">
        <span className="font-display text-sm font-bold text-gold">K</span>
      </span>
      <span className={`font-display text-lg font-semibold tracking-tight ${onInk ? "text-ink-foreground" : "text-foreground"}`}>
        Know<span className="text-gold">Market</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isSeller } = useRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: cartCount = 0 } = useQuery({
    queryKey: ["cart-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("cart_items").select("id", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <>
      <Link to="/explore" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
        Explore
      </Link>
      <Link to="/sell" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
        Sell knowledge
      </Link>
      {user && (
        <Link to="/library" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
          Library
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">{nav}</nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" className="relative" aria-label="Cart">
                <Link to="/cart">
                  <ShoppingBag />
                  {cartCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-9 w-9 place-items-center rounded-full surface-ink text-xs font-bold text-gold ring-2 ring-background" aria-label="Account menu">
                    {initials(profile?.full_name || user.email)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{profile?.full_name || user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/library" })}><BookOpen /> My library</DropdownMenuItem>
                  {isSeller && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}><LayoutDashboard /> Seller dashboard</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate({ to: "/account" })}><User /> Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}><LogOut /> Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button>
              <Button asChild variant="ink"><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            <Menu />
          </Button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-4 border-t border-border px-6 py-4 md:hidden" onClick={() => setOpen(false)}>
          {nav}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="surface-ink mt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo onInk />
          <p className="mt-4 max-w-sm text-sm text-ink-muted">
            The marketplace for research, datasets and expert insight — bought and sold by the people who create it.
          </p>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="font-semibold text-ink-foreground">Marketplace</p>
          <Link to="/explore" className="block text-ink-muted hover:text-gold">Explore products</Link>
          <Link to="/explore" search={{ category: "datasets" }} className="block text-ink-muted hover:text-gold">Datasets</Link>
          <Link to="/explore" search={{ category: "research" }} className="block text-ink-muted hover:text-gold">Research papers</Link>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="font-semibold text-ink-foreground">Creators</p>
          <Link to="/sell" className="block text-ink-muted hover:text-gold">Become a seller</Link>
          <Link to="/auth" className="block text-ink-muted hover:text-gold">Sign in</Link>
        </div>
      </div>
      <div className="border-t border-ink-border py-5 text-center text-xs text-ink-muted">
        © {new Date().getFullYear()} KnowMarket. Knowledge, fairly traded.
      </div>
    </footer>
  );
}
