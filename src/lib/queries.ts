import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_SELECT =
  "id, title, description, price, currency, file_format, file_size, file_name, item_count, license, tags, status, purchases_count, rating, rating_count, created_at, updated_at, preview_path, seller_id, category_id, categories(id, name, slug), profiles!products_seller_id_fkey(id, full_name, avatar_url, is_verified, expertise)";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
};

export type ProductRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  file_format: string | null;
  file_size: number | null;
  file_name: string | null;
  item_count: number | null;
  license: string;
  tags: string[];
  status: string;
  purchases_count: number;
  rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  preview_path: string | null;
  seller_id: string;
  category_id: string | null;
  categories: { id: string; name: string; slug: string } | null;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    expertise: string | null;
  } | null;
};

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, description, icon")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    staleTime: 5 * 60 * 1000,
  });

export type ExploreFilters = {
  search?: string | undefined;
  category?: string | undefined;
  format?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  sort?: "newest" | "popular" | "price-asc" | "price-desc" | undefined;
};

export const exploreProductsQuery = (filters: ExploreFilters) =>
  queryOptions({
    queryKey: ["products", "explore", filters],
    queryFn: async (): Promise<ProductRow[]> => {
      let query = supabase.from("products").select(PRODUCT_SELECT).eq("status", "published");

      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.format) query = query.eq("file_format", filters.format);
      if (typeof filters.minPrice === "number") query = query.gte("price", filters.minPrice);
      if (typeof filters.maxPrice === "number") query = query.lte("price", filters.maxPrice);
      if (filters.minRating) query = query.gte("rating", filters.minRating);

      switch (filters.sort) {
        case "popular":
          query = query.order("purchases_count", { ascending: false });
          break;
        case "price-asc":
          query = query.order("price", { ascending: true });
          break;
        case "price-desc":
          query = query.order("price", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query.limit(60);
      if (error) throw error;
      let rows = (data ?? []) as unknown as ProductRow[];
      if (filters.category) rows = rows.filter((row) => row.categories?.slug === filters.category);
      return rows;
    },
  });

export const featuredProductsQuery = () =>
  queryOptions({
    queryKey: ["products", "featured"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "published")
        .order("purchases_count", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    },
  });

export const productQuery = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: async (): Promise<ProductRow | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ProductRow) ?? null;
    },
  });

export const sellerProductsQuery = (sellerId?: string) =>
  queryOptions({
    queryKey: ["products", "seller", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("seller_id", sellerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    },
  });

export type CartRow = { id: string; product_id: string; products: ProductRow | null };

export const cartQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["cart", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CartRow[]> => {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`id, product_id, products(${PRODUCT_SELECT})`)
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });

export type PurchaseRow = {
  id: string;
  price: number;
  created_at: string;
  product_id: string;
  products: ProductRow | null;
  orders: { id: string; status: string; created_at: string } | null;
};

export const purchasesQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["purchases", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PurchaseRow[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`id, price, created_at, product_id, products(${PRODUCT_SELECT}), orders(id, status, created_at)`)
        .eq("buyer_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as PurchaseRow[]).filter(
        (row) => row.orders?.status === "paid",
      );
    },
  });

export type SaleRow = {
  id: string;
  price: number;
  created_at: string;
  product_id: string;
  buyer_id: string;
  products: { id: string; title: string; file_format: string | null } | null;
  profiles: { full_name: string; avatar_url: string | null } | null;
};

export const salesQuery = (sellerId?: string) =>
  queryOptions({
    queryKey: ["sales", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<SaleRow[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select(
          "id, price, created_at, product_id, buyer_id, products(id, title, file_format), profiles!order_items_seller_id_fkey(full_name, avatar_url)",
        )
        .eq("seller_id", sellerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SaleRow[];
    },
  });

export const sellerPublicQuery = (sellerId: string) =>
  queryOptions({
    queryKey: ["seller", sellerId],
    queryFn: async () => {
      const [{ data: profile, error }, { data: products, error: productError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, bio, expertise, is_verified, created_at")
          .eq("id", sellerId)
          .maybeSingle(),
        supabase
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("seller_id", sellerId)
          .eq("status", "published")
          .order("created_at", { ascending: false }),
      ]);
      if (error) throw error;
      if (productError) throw productError;
      return {
        profile: profile as {
          id: string;
          full_name: string;
          avatar_url: string | null;
          bio: string | null;
          expertise: string | null;
          is_verified: boolean;
          created_at: string;
        } | null,
        products: (products ?? []) as unknown as ProductRow[],
      };
    },
  });

export const FILE_FORMATS = [
  "PDF",
  "DOC",
  "DOCX",
  "TXT",
  "CSV",
  "XLS",
  "XLSX",
  "JSON",
  "PPT",
  "PPTX",
  "ZIP",
] as const;
