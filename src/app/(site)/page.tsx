import Link from "next/link";
import Image from "next/image";
import { Star, UtensilsCrossed, Wine, GlassWater, Award } from "lucide-react";
import Marquee from "@/components/Marquee";
import Reveal from "@/components/Reveal";
import MenuCard from "@/components/MenuCard";
import { type Dish, MENU } from "@/data/menu";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicRestaurantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const CUISINE_TILES = [
  { name: "North Indian", img: "/img/category/2.jpg" },
  { name: "South Indian", img: "/img/category/3.jpg" },
  { name: "Royal Mughlai", img: "/img/category/4.jpg" },
  { name: "Coastal Seafood", img: "/img/category/5.jpg" },
  { name: "Tandoor & Starters", img: "/img/category/1.jpg" },
  { name: "Mithai & Desserts", img: "/img/category/6.jpg" },
];

export default async function Home() {
  const rest = await resolvePublicRestaurantBySlug("lumiere");
  const supabase = await createClient();
  let query = supabase.from("menu_items").select("*").not("badge", "is", null).order("sort").limit(6);
  if (rest) {
    query = query.eq("restaurant_id", rest.id);
  }
  const { data } = await query;
  const dbDishes = (data as Dish[]) || [];
  const INDIAN_CUISINES = ["North Indian", "South Indian", "Royal Mughlai", "Coastal Seafood", "Tandoor & Starters", "Mithai & Desserts"];
  const validDbDishes = dbDishes.filter((d) => INDIAN_CUISINES.includes(d.cuisine as string));
  const featured = validDbDishes.length >= 6 ? validDbDishes : MENU.filter((d) => d.badge).slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-cream">
        <div className="pointer-events-none absolute -top-10 right-0 font-serif text-[22vw] leading-none text-gold/[0.06] select-none">
          LUMIERE
        </div>
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-10 items-center min-h-[86vh] py-16">
          <Reveal>
            <span className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 text-xs shadow-sm">
              <Star size={13} className="text-gold fill-gold" /> Award-Winning Fine Dining — Bengaluru, India
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl leading-[1.05] mt-5 text-ink">
              A Royal Journey of <span className="text-wine italic">Authentic Indian Flavours</span>
            </h1>
            <p className="text-neutral-600 mt-5 max-w-lg leading-relaxed">
              Celebrating the rich culinary heritage of India — from slow-cooked Awadhi Dum Biryanis and Kashmiri Rogan Josh to Coastal Chettinad Lobsters and Artisanal Mithai.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link href="/menu" className="btn-wine">
                <UtensilsCrossed size={18} /> Explore the Menu
              </Link>
              <Link href="/reservations" className="btn-outline">
                Reserve a Table
              </Link>
            </div>
            <div className="flex flex-wrap gap-8 mt-10">
              {[
                ["100+", "Authentic Dishes"],
                ["Top 10", "Indian Fine Dining"],
                ["15+", "Master Khansamas"],
                ["24yr", "Of Heritage"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-serif text-3xl text-wine">{n}</div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative">
              <div className="relative aspect-square rounded-full overflow-hidden border-8 border-white shadow-2xl">
                <Image src="/img/banner-img.jpg" alt="Signature plating at Lumiere" fill className="object-cover" priority sizes="50vw" />
              </div>
              <FloatCard className="top-6 -left-2" icon={<Wine size={16} />} title="Spices & Infusions" sub="Heritage Cellar" />
              <FloatCard className="bottom-24 -right-2" icon={<Star size={16} />} title="4.9/5" sub="2k+ reviews" />
              <FloatCard className="-bottom-2 left-10" icon={<GlassWater size={16} />} title="Royal Thali" sub="Tasting Experience" />
            </div>
          </Reveal>
        </div>
      </section>

      <Marquee />

      {/* CUISINES */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center mb-12">
            <span className="section-label">Culinary Regions of India</span>
            <h2 className="font-serif text-4xl mt-2">Explore by <span className="text-wine">Region</span></h2>
            <div className="gold-line mx-auto mt-4" />
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CUISINE_TILES.map((c, i) => (
              <Reveal key={c.name} delay={i * 0.05}>
                <Link href={`/menu?c=${c.name}`} className="group block relative rounded-2xl overflow-hidden aspect-[3/4]">
                  <Image src={c.img} alt={c.name} fill sizes="16vw" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  <span className="absolute bottom-3 left-0 right-0 text-center text-white font-serif text-sm px-1">{c.name}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section className="py-20 bg-cream">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-xl aspect-[4/3] relative">
                <Image src="/img/about1.jpg" alt="The dining room" fill className="object-cover" sizes="50vw" />
              </div>
              <div className="absolute -bottom-6 -right-4 bg-wine text-white rounded-2xl px-6 py-4 text-center shadow-lg">
                <div className="font-serif text-3xl">24+</div>
                <div className="text-[0.65rem] uppercase tracking-wide">Years of Excellence</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <span className="section-label">Our Story</span>
            <h2 className="font-serif text-4xl mt-2">One Kitchen,<br /> India&apos;s <span className="text-wine">Greatest Recipes</span></h2>
            <div className="gold-line mt-4" />
            <p className="text-neutral-600 mt-5 leading-relaxed">
              Founded in 2002, Lumiere was born from a passion to showcase the diverse regional royal kitchens of India under one roof — crafted with royal khansama techniques and authentic farm-fresh ingredients.
            </p>
            <div className="space-y-4 mt-6">
              {[
                [<Award size={18} key="a" />, "Royal Heritage Recipes", "Preserving centuries-old Awadhi, Mughlai, and Chettinad culinary secrets."],
                [<UtensilsCrossed size={18} key="b" />, "Handcrafted Spices", "Whole spices stone-ground daily from trusted spice gardens in Kerala and Kashmir."],
                [<Wine size={18} key="c" />, "Gracious Indian Hospitality", "Atithi Devo Bhava — unhurried, royal service tailored for your dining comfort."],
              ].map(([icon, t, d]) => (
                <div key={t as string} className="flex gap-3">
                  <span className="grid place-items-center w-10 h-10 rounded-full bg-wine/10 text-wine shrink-0">{icon}</span>
                  <div>
                    <h4 className="font-semibold text-ink">{t as string}</h4>
                    <p className="text-sm text-neutral-500">{d as string}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/about" className="btn-outline mt-7">Discover Our Story</Link>
          </Reveal>
        </div>
      </section>

      {/* FEATURED MENU */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center mb-12">
            <span className="section-label">The Menu</span>
            <h2 className="font-serif text-4xl mt-2">Signature <span className="text-wine">Plates</span></h2>
            <div className="gold-line mx-auto mt-4" />
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((d) => (
              <MenuCard key={d.id} dish={d} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/menu" className="btn-wine">View the Full Menu</Link>
          </div>
        </div>
      </section>

      {/* TASTING MENU CTA */}
      <section className="relative py-24 bg-ink text-white overflow-hidden">
        <Image src="/img/off-img.jpg" alt="" fill className="object-cover opacity-20" sizes="100vw" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <span className="section-label">This Season Only</span>
            <h2 className="font-serif text-4xl sm:text-5xl mt-3 text-white">
              <span className="text-white">The Seven-Course</span> <span className="text-gold">Royal Indian Thali</span>
            </h2>
            <p className="text-white/70 mt-5 max-w-xl mx-auto">
              Seven authentic royal courses — an exquisite voyage through Kashmir, Lucknow, Malabar, and Bengal, paired course by course with signature botanical coolers and craft teas.
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <span className="line-through text-white/40 text-xl">₹1,850</span>
              <span className="font-serif text-4xl text-gold">₹1,450</span>
              <span className="text-white/50 text-sm">per guest</span>
            </div>
            <Link href="/reservations" className="btn-gold mt-8">Reserve the Experience</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function FloatCard({ className, icon, title, sub }: { className: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className={`absolute ${className} bg-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2.5`}>
      <span className="grid place-items-center w-9 h-9 rounded-full bg-gold/20 text-wine">{icon}</span>
      <span>
        <span className="block font-semibold text-sm text-ink">{title}</span>
        <span className="block text-[0.7rem] text-neutral-400">{sub}</span>
      </span>
    </div>
  );
}
