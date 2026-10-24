import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns a short-lived signed URL for a product's original file.
 * Only the seller who owns it, or a buyer with a paid order, ever gets a URL.
 */
export const getProductDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error } = await supabase
      .from("products")
      .select("id, seller_id, file_path, file_name")
      .eq("id", data.productId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!product?.file_path) throw new Error("This product has no downloadable file.");

    let allowed = product.seller_id === userId;
    if (!allowed) {
      const { data: purchased, error: rpcError } = await supabase.rpc("has_purchased", {
        _user_id: userId,
        _product_id: data.productId,
      });
      if (rpcError) throw new Error(rpcError.message);
      allowed = purchased === true;
    }
    if (!allowed) throw new Error("You need to purchase this product before downloading it.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("product-files")
      .createSignedUrl(product.file_path, 120, {
        download: product.file_name ?? true,
      });
    if (signError || !signed?.signedUrl) throw new Error("Could not prepare the download link.");

    return { url: signed.signedUrl, fileName: product.file_name };
  });

/** Signed URL for a product's public preview/sample file. */
export const getPreviewUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ previewPath: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("product-previews")
      .createSignedUrl(data.previewPath, 600);
    if (error || !signed?.signedUrl) throw new Error("Preview is unavailable right now.");
    return { url: signed.signedUrl };
  });
