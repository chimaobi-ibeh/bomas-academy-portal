import { supabase } from "@/integrations/supabase/client";
import type { SiteContent } from "@/lib/use-site-content";

/**
 * Fetchers shared by the route loaders (run on the server, so the first HTML already holds
 * the real text and photos) and by the components (which keep the data fresh afterwards).
 */
export async function fetchContent(): Promise<SiteContent> {
  const { data, error } = await supabase.from("site_content").select("key, value");
  if (error) throw error;
  const map: SiteContent = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
}

export async function fetchHomeNews() {
  const { data, error } = await supabase
    .from("news_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  return data ?? [];
}

export async function fetchHomeGallery() {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

export async function fetchNewsList() {
  const { data, error } = await supabase
    .from("news_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchStaff() {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchGallery() {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** A loader must never take the page down: if the data cannot be read, the page shows its defaults. */
export async function orNothing<T>(load: () => Promise<T>): Promise<T | undefined> {
  try {
    return await load();
  } catch {
    return undefined;
  }
}
