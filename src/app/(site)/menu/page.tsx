import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import MenuBrowser from "@/components/MenuBrowser";
import PageHero from "@/components/PageHero";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicRestaurantBySlug } from "@/lib/tenant";
import { type Dish, MENU } from "@/data/menu";

export const metadata: Metadata = {
  title: "Menu",
  description: "The full Lumiere menu - royal delicacies from North India, South India, Mughlai kitchens, Coastal sea catches, and handcrafted Mithai.",
};

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const rest = await resolvePublicRestaurantBySlug("lumiere");
  const supabase = await createClient();
  let query = supabase.from("menu_items").select("*").order("sort");
  if (rest) {
    query = query.eq("restaurant_id", rest.id);
  }
  const { data } = await query;
  const dbDishes = (data as Dish[]) || [];
  const INDIAN_CUISINES = ["North Indian", "South Indian", "Royal Mughlai", "Coastal Seafood", "Tandoor & Starters", "Mithai & Desserts"];
  const validDbDishes = dbDishes.filter((d: any) => INDIAN_CUISINES.includes(d.cuisine));
  const dishes = validDbDishes.length >= 6 ? validDbDishes : MENU;
  return (
    <>
      <PageHero
        label="Royal Carte"
        title="Our Signature Indian Dishes"
        sub="Every dish is a tribute to India's culinary royalty — rooted in heritage recipes, stone-ground spices, and unhurried craftsmanship."
      />
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <MenuBrowser initial={c ?? "All"} dishes={dishes} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
