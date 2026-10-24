import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 1 test checkout. Prices are read server-side from the database, never
 * trusted from the client. Swap the "test" provider for Razorpay/Stripe later:
 * create a pending order here, then mark it paid from the gateway webhook.
 */
export const checkoutCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: cart, error } = await supabase
      .from("cart_items")
      .select("id, product_id, products(id, price, seller_id, status)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    type Item = { id: string; product_id: string; products: { id: string; price: number; seller_id: string; status: string } | null };
    const items = ((cart ?? []) as unknown as Item[]).filter(
      (i) => i.products && i.products.status === "published" && i.products.seller_id !== userId,
    );
    const eligible: Item[] = [];
    for (const item of items) {
      const { data: owned } = await supabase.rpc("has_purchased", { _user_id: userId, _product_id: item.product_id });
      if (!owned) eligible.push(item);
    }
    if (eligible.length === 0) throw new Error("Your cart has no items that can be purchased.");

    const total = eligible.reduce((sum, i) => sum + Number(i.products!.price), 0);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        buyer_id: userId,
        total_amount: total,
        status: "paid",
        payment_provider: "test",
        payment_reference: `TEST-${Date.now()}`,
      })
      .select("id")
      .single();
    if (orderError || !order) throw new Error("Could not create your order.");

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      eligible.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        seller_id: i.products!.seller_id,
        buyer_id: userId,
        price: i.products!.price,
      })),
    );
    if (itemsError) throw new Error("Could not record your purchase.");

    for (const i of eligible) {
      const { data: p } = await supabaseAdmin.from("products").select("purchases_count").eq("id", i.product_id).single();
      await supabaseAdmin.from("products").update({ purchases_count: (p?.purchases_count ?? 0) + 1 }).eq("id", i.product_id);
    }
    await supabaseAdmin.from("cart_items").delete().eq("user_id", userId);

    return { orderId: order.id, total, count: eligible.length };
  });

/** Adds the seller role to the signed-in user (same account, one auth system). */
export const becomeSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "seller" }, { onConflict: "user_id,role" });
    if (error) throw new Error("Could not enable your seller account.");
    return { ok: true };
  });
