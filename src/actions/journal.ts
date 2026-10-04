"use server";

import { createClient } from "@/lib/supabase/server";
import { resolvePublicRestaurantBySlug } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export type JournalPost = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  author_name: string;
  author_role?: string;
  image_url: string;
  read_time?: string;
  published: boolean;
  published_at: string;
  created_at: string;
};

const DEFAULT_JOURNAL_POSTS: JournalPost[] = [
  {
    id: "post-1",
    slug: "secrets-of-lucknow-dum-pukht",
    title: "Secrets of Lucknow: The Art of Dum Pukht Cooking",
    category: "Kitchen Stories",
    excerpt: "A morning spice grinding ritual, sealed clay handis, and the slow-cooking secrets of Awadhi khansamas passed down through centuries.",
    content: `The art of Dum Pukht — literally meaning "to cook by steam" — was born in the royal court of Nawab Asaf-ud-Daula in 18th-century Awadh. During a devastating famine in 1784, the Nawab initiated the construction of the Bara Imambara to provide work for his citizens. Large cauldrons of meat, rice, and aromatic spices were sealed with dough rings and cooked over low coals to feed thousands of workers day and night.

When the Nawab sampled these slow-cooked pots, the fragrance and tenderness overwhelmed the royal palate. Thus, a famine relief cooking style was elevated into the highest tier of Indian royal gastronomy.

At Lumière, our Master Chef Rajesh Verma continues this sacred lineage. Every morning begins at 5:00 AM with hand-grinding 24 spices in stone mortars — stone-flower (dagad phool), yellow chili, star anise, cardamom pods, and vetiver root (khus). The meat is marinated in aged yogurt and mustard oil, sealed inside hand-crafted clay handis, and buried under hot wood embers for seven hours.

When the seal of dough is broken at your table, the released steam transports you directly to the marble courtyards of old Lucknow.`,
    author_name: "Chef Rajesh Verma",
    author_role: "Executive Khansama",
    image_url: "/img/blog/1.jpg",
    read_time: "5 min read",
    published: true,
    published_at: "2026-03-14",
    created_at: "2026-03-14T10:00:00Z",
  },
  {
    id: "post-2",
    slug: "spices-of-kerala-pepper-coast",
    title: "Spices of Kerala: A Journey Through the Pepper Coast",
    category: "Spice Route",
    excerpt: "Chasing Idukki green cardamom, Tellicherry extra bold black pepper, and fresh nutmeg from the high-altitude spice gardens of Malabar.",
    content: `For over three millennia, the ancient port of Muziris in Kerala drew Phoenician, Roman, Arab, and Chinese traders seeking the world's finest black gold: Malabar pepper.

Our Culinary Director, Chef Priya Sundaram, embarks on biannual sourcing trips to the high-elevation misty hills of Idukki and Wayanad. We partner directly with organic family estates that harvest black pepper at peak sun-ripeness before hand-drying the berries on bamboo mats.

In our kitchen, pepper is never treated as a secondary seasoning. It is celebrated as a lead botanical element. In our Coastal Malabar Prawn Curry, cracked Tellicherry pepper works in harmony with freshly extracted coconut milk and hand-torn curry leaves from our rooftop herb garden.

Understanding the terroir of spices elevates fine dining into an immersive journey across India's coastline.`,
    author_name: "Chef Priya Sundaram",
    author_role: "Spice Specialist",
    image_url: "/img/blog/2.jpg",
    read_time: "4 min read",
    published: true,
    published_at: "2026-02-28",
    created_at: "2026-02-28T10:00:00Z",
  },
  {
    id: "post-3",
    slug: "craft-of-saffron-silver-mithai",
    title: "The Craft of Saffron & Silver Leaf Mithai",
    category: "Royal Desserts",
    excerpt: "How our master confectioners slow-simmer Rabri in copper kadais and craft golden Shahi Tukda adorned with 24k edible silver vark.",
    content: `Royal Indian confectionery is an intricate discipline requiring patience, temperature precision, and uncompromised ingredients.

Our signature Shahi Tukda begins with artisanal brioche dipped in warm saffron syrup infused with Kashmiri Mongra saffron threads — the most coveted variety in the world. The bread is then layered with rich Rabri that has been reduced over low wood fires in heavy copper kadais for five hours until velvety and caramelized.

Finally, the dish is finished with delicate 24-karat edible silver leaf (Vark) applied with specialized feather brushes. Paired with house-made pistachios and rose petals from Kannauj, it offers a sweet crescendo worthy of royalty.`,
    author_name: "Chef Vikram Malhotra",
    author_role: "Master Pastry Chef",
    image_url: "/img/blog/3.jpg",
    read_time: "6 min read",
    published: true,
    published_at: "2026-01-05",
    created_at: "2026-01-05T10:00:00Z",
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Fetch all journal posts (Supabase DB with fallback to DEFAULT_JOURNAL_POSTS)
 */
export async function getJournalPostsAction(includeUnpublished = false): Promise<JournalPost[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("journal_posts").select("*").order("created_at", { ascending: false });
    if (!includeUnpublished) {
      query = query.eq("published", true);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return includeUnpublished
        ? DEFAULT_JOURNAL_POSTS
        : DEFAULT_JOURNAL_POSTS.filter((p) => p.published);
    }
    return data as JournalPost[];
  } catch (err) {
    console.warn("Falling back to default journal posts:", err);
    return includeUnpublished
      ? DEFAULT_JOURNAL_POSTS
      : DEFAULT_JOURNAL_POSTS.filter((p) => p.published);
  }
}

/**
 * Fetch single post by slug
 */
export async function getJournalPostBySlugAction(slug: string): Promise<JournalPost | null> {
  const posts = await getJournalPostsAction(true);
  return posts.find((p) => p.slug === slug || p.id === slug) || null;
}

/**
 * Create a new journal post
 */
export async function createJournalPostAction(formData: FormData): Promise<{ ok: boolean; error?: string; post?: JournalPost }> {
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "Kitchen Stories").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const author_name = String(formData.get("author_name") || "Lumière Chef").trim();
  const author_role = String(formData.get("author_role") || "Culinary Team").trim();
  const image_url = String(formData.get("image_url") || "/img/blog/1.jpg").trim();
  const read_time = String(formData.get("read_time") || "4 min read").trim();
  const published = formData.get("published") === "true" || formData.get("published") === "on";

  if (!title || !excerpt || !content) {
    return { ok: false, error: "Please fill in Title, Excerpt, and Full Content." };
  }

  const slug = slugify(title) || `post-${Date.now()}`;
  const now = new Date().toISOString();

  const newPost: JournalPost = {
    id: `post-${Date.now()}`,
    slug,
    title,
    category,
    excerpt,
    content,
    author_name,
    author_role,
    image_url,
    read_time,
    published,
    published_at: now.split("T")[0],
    created_at: now,
  };

  try {
    const rest = await resolvePublicRestaurantBySlug("lumiere");
    const supabase = await createClient();
    const { error } = await supabase.from("journal_posts").insert({
      restaurant_id: rest?.id,
      slug,
      title,
      category,
      excerpt,
      content,
      author_name,
      author_role,
      image_url,
      read_time,
      published,
      published_at: newPost.published_at,
    });

    if (error) {
      console.warn("DB insert error for journal post, returning in-memory representation:", error.message);
    }
  } catch (e) {
    console.warn("Supabase table journal_posts not available:", e);
  }

  revalidatePath("/blog");
  revalidatePath("/admin/journal");
  return { ok: true, post: newPost };
}

/**
 * Update an existing journal post
 */
export async function updateJournalPostAction(
  id: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "Kitchen Stories").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const author_name = String(formData.get("author_name") || "Lumière Chef").trim();
  const author_role = String(formData.get("author_role") || "Culinary Team").trim();
  const image_url = String(formData.get("image_url") || "/img/blog/1.jpg").trim();
  const read_time = String(formData.get("read_time") || "4 min read").trim();
  const published = formData.get("published") === "true" || formData.get("published") === "on";

  if (!title || !excerpt || !content) {
    return { ok: false, error: "Title, Excerpt, and Content are required." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("journal_posts")
      .update({
        title,
        category,
        excerpt,
        content,
        author_name,
        author_role,
        image_url,
        read_time,
        published,
      })
      .eq("id", id);

    if (error) {
      console.warn("Supabase update error:", error.message);
    }
  } catch (e) {
    console.warn("Could not update post in DB:", e);
  }

  revalidatePath("/blog");
  revalidatePath("/admin/journal");
  return { ok: true };
}

/**
 * Delete a journal post
 */
export async function deleteJournalPostAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("journal_posts").delete().eq("id", id);
    if (error) console.warn("Supabase delete error:", error.message);
  } catch (e) {
    console.warn("Could not delete post from DB:", e);
  }

  revalidatePath("/blog");
  revalidatePath("/admin/journal");
  return { ok: true };
}

/**
 * Toggle published status of a post
 */
export async function togglePublishJournalPostAction(
  id: string,
  published: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("journal_posts").update({ published }).eq("id", id);
    if (error) console.warn("Supabase toggle publish error:", error.message);
  } catch (e) {
    console.warn("Could not toggle publish state in DB:", e);
  }

  revalidatePath("/blog");
  revalidatePath("/admin/journal");
  return { ok: true };
}
