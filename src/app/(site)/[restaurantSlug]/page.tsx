import Link from "next/link";
import { Utensils, Calendar, MapPin, Phone, Clock, AlertCircle } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import RestaurantWatermark from "@/components/RestaurantWatermark";
import RestaurantLogoHeader from "@/components/RestaurantLogoHeader";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicRestaurantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicRestaurantLandingPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>;
}) {
  const { restaurantSlug } = await params;
  const restaurant = await resolvePublicRestaurantBySlug(restaurantSlug);

  if (!restaurant) {
    return (
      <>
        <PageHero label="Welcome" title="Restaurant Not Found" sub="The restaurant link you followed is invalid or currently inactive." />
        <section className="py-16 bg-cream">
          <div className="mx-auto max-w-xl px-5 text-center">
            <div className="bg-white rounded-2xl p-8 shadow-md space-y-4 border border-cream2">
              <AlertCircle size={48} className="text-amber-600 mx-auto" />
              <h3 className="font-serif text-2xl text-ink">Invalid or Inactive Restaurant</h3>
              <p className="text-neutral-600 text-sm">
                We could not locate an active restaurant matching &quot;{restaurantSlug}&quot;.
              </p>
            </div>
          </div>
        </section>
      </>
    );
  }

  const supabase = await createClient();
  const { data: menu } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("available", true)
    .order("sort");

  const logoUrl = restaurant.branding?.logo_url || restaurant.logo || "/Shinchan.jpg";
  const watermarkEnabled = restaurant.branding?.background_logo_enabled ?? true;
  const watermarkOpacity = restaurant.branding?.background_logo_opacity ?? 0.10;

  return (
    <div className="relative min-h-screen">
      <RestaurantWatermark
        logoUrl={logoUrl}
        enabled={watermarkEnabled}
        opacity={watermarkOpacity}
        restaurantName={restaurant.name}
      />

      <div className="relative z-10">
        <section className="bg-ink text-white py-20 px-5 text-center relative overflow-hidden">
          <div className="mx-auto max-w-4xl space-y-6">
            <RestaurantLogoHeader logoUrl={logoUrl} name={restaurant.name} size="lg" />
            <h1 className="font-serif text-4xl md:text-6xl tracking-tight font-medium text-cream">{restaurant.name}</h1>
            <p className="text-white/70 max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed">
              Welcome to {restaurant.name}. Reserve your table online or browse our curated culinary creations.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link
                href={`/${restaurant.slug}/reservations`}
                className="btn-wine text-sm py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Calendar size={18} /> Book a Table
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 bg-cream/80 backdrop-blur-xs">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center mb-12">
              <span className="text-xs uppercase tracking-[0.25em] text-wine font-semibold">Chef's Menu</span>
              <h2 className="font-serif text-3xl md:text-4xl text-ink mt-2">Signature Dishes</h2>
              <div className="w-12 h-0.5 bg-gold mx-auto mt-4" />
            </div>

            {menu && menu.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {menu.map((item: any) => (
                  <Reveal key={item.id}>
                    <div className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 flex justify-between gap-4">
                      <div>
                        <h3 className="font-serif text-lg text-ink font-semibold">{item.name}</h3>
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{item.description}</p>
                      </div>
                      <span className="font-serif text-lg font-bold text-wine shrink-0">₹{item.price}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-cream2">
                <Utensils size={36} className="text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600 text-sm">Menu selection is currently being updated by the chef.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
