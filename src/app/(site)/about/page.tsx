import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicRestaurantBySlug } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Our Story & Team",
  description: "Two decades at the table - the story of Lumiere and the masters, chefs, sommeliers, inventory specialists, and floor staff behind Mayfair's fine dining experience.",
};

export const dynamic = "force-dynamic";

const TIMELINE = [
  ["2002", "A Single Table", "Lumiere opens as an intimate 20-seat room in Mayfair, serving a menu that changes with whatever our chefs carry home from their travels."],
  ["2009", "The World Arrives", "We build a brigade of specialists from France, Italy and Japan. The seven-course tasting menu is born and quickly becomes London's hardest reservation."],
  ["2016", "Two Michelin Stars", "Awarded our second Michelin star for a menu that moves seamlessly across continents without ever losing its soul."],
  ["2024", "A Modern Classic", "Today Lumiere welcomes guests from every corner of the world to a single table where each great cuisine is given equal reverence."],
];

const CHEF_IMAGES: Record<string, string> = {
  "Antoine Laurent": "/img/chefs/1.jpg",
  "Alice Moreau": "/img/chefs/2.jpg",
  "Marco Bianchi": "/img/chefs/2.jpg",
  "Kenji Tanaka": "/img/chefs/3.jpg",
  "Camille Laurent": "/img/chefs/4.jpg",
};

interface StaffMember {
  id: string;
  employee_code: string;
  full_name: string;
  department: string;
  designation: string;
  notes?: string;
  joining_date?: string;
}

export default async function AboutPage() {
  const rest = await resolvePublicRestaurantBySlug("lumiere");
  const supabase = await createClient();

  let query = supabase
    .from("employee_records")
    .select("id, employee_code, full_name, department, designation, notes, joining_date")
    .eq("status", "active")
    .order("employee_code");

  if (rest) {
    query = query.eq("restaurant_id", rest.id);
  }

  const { data } = await query;
  const staffList: StaffMember[] = data ?? [];

  // Group staff members by department category
  const kitchenStaff = staffList.filter((s) => s.department === "Kitchen");
  const inventoryStaff = staffList.filter((s) => s.department === "Inventory & Operations");
  const beverageStaff = staffList.filter((s) => s.department === "Beverage & Wine");
  const managementStaff = staffList.filter((s) => s.department === "Management");
  const serviceStaff = staffList.filter((s) => s.department === "Service & Floor");

  return (
    <>
      <PageHero
        label="Our Story & Team"
        title="Two Decades at the Table"
        sub="From an intimate Mayfair room to a two-star destination - driven by master chefs, inventory specialists, sommeliers, and dedicated service staff."
      />

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                <Image src="/img/about1.jpg" alt="Dining room" fill className="object-cover" sizes="25vw" />
              </div>
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg mt-8">
                <Image src="/img/about2.jpg" alt="Plating" fill className="object-cover" sizes="25vw" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <span className="section-label">One Kitchen, Every Great Cuisine</span>
            <h2 className="font-serif text-4xl mt-2">An Obsession with <span className="text-wine">Craft</span></h2>
            <div className="gold-line mt-4" />
            <p className="text-neutral-600 mt-5 leading-relaxed">
              Founded in 2002, Lumiere was born from a simple obsession - to gather the world&apos;s finest
              culinary traditions under one roof and serve them with the precision of haute cuisine. Two
              decades on, our chefs travel the globe so that every plate tells the story of where it came from.
            </p>
            <p className="text-neutral-600 mt-4 leading-relaxed">
              We source line-caught fish, single-estate produce and rare seasonal finds daily. Dedicated
              inventory auditors oversee ingredient freshness and traceability, while master sommeliers pair
              each course from a cellar of over four hundred wines.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-cream">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal className="text-center mb-14">
            <span className="section-label">Our Journey</span>
            <h2 className="font-serif text-4xl mt-2">A History of the <span className="text-wine">Table</span></h2>
            <div className="gold-line mx-auto mt-4" />
          </Reveal>
          <div className="relative border-l-2 border-gold/40 ml-3 space-y-10">
            {TIMELINE.map(([year, title, body], i) => (
              <Reveal key={year} delay={i * 0.05}>
                <div className="relative pl-8">
                  <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-gold ring-4 ring-cream" />
                  <div className="font-serif text-2xl text-wine">{year}</div>
                  <h4 className="font-semibold text-ink mt-1">{title}</h4>
                  <p className="text-neutral-600 text-sm mt-1 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Culinary Brigade Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center mb-12">
            <span className="section-label">Culinary Masters & Brigade</span>
            <h2 className="font-serif text-4xl mt-2">Our Master <span className="text-wine">Chefs</span></h2>
            <div className="gold-line mx-auto mt-4" />
            <p className="text-neutral-500 text-sm mt-3 max-w-xl mx-auto">
              Our kitchen team brings together Michelin-starred craftsmanship spanning French haute cuisine, Italian risotto mastery, and Japanese sushi arts.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {kitchenStaff.map((chef, i) => {
              const imgUrl = CHEF_IMAGES[chef.full_name];
              return (
                <Reveal key={chef.id} delay={i * 0.05}>
                  <div className="group bg-cream/40 border border-cream2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    {imgUrl ? (
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                          src={imgUrl}
                          alt={chef.full_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <span className="absolute top-3 left-3 bg-wine/90 text-white text-[11px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                          {chef.employee_code}
                        </span>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gradient-to-br from-wine to-wine/80 text-white p-6 flex flex-col justify-between relative">
                        <span className="bg-white/20 text-white text-[11px] font-mono px-2.5 py-1 rounded-full w-fit uppercase tracking-wider">
                          {chef.employee_code}
                        </span>
                        <div>
                          <div className="w-12 h-12 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center font-serif text-xl text-gold mb-2">
                            {chef.full_name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <h4 className="font-serif text-xl text-white">{chef.full_name}</h4>
                        </div>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="text-xs uppercase tracking-wider font-semibold text-gold mb-1">
                        {chef.department}
                      </div>
                      <h3 className="font-serif text-xl text-ink font-semibold">{chef.full_name}</h3>
                      <p className="text-wine font-medium text-sm mt-0.5">{chef.designation}</p>
                      {chef.notes && (
                        <p className="text-neutral-600 text-sm mt-3 border-t border-cream2 pt-3 leading-relaxed">
                          {chef.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Operations, Inventory, Sommelier & Floor Service */}
      <section className="py-20 bg-cream">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center mb-14">
            <span className="section-label">Hospitality & Operations</span>
            <h2 className="font-serif text-4xl mt-2">The People Behind <span className="text-wine">The Experience</span></h2>
            <div className="gold-line mx-auto mt-4" />
            <p className="text-neutral-600 text-sm mt-3 max-w-2xl mx-auto">
              From cellar management and daily ingredient stock inspection to floor service and guest relations, our dedicated staff ensures perfection in every detail.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...inventoryStaff, ...beverageStaff, ...managementStaff, ...serviceStaff].map((staff, i) => (
              <Reveal key={staff.id} delay={i * 0.04}>
                <div className="bg-white border border-cream2 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-wine/10 text-wine text-[11px] font-mono px-2.5 py-1 rounded-md font-semibold">
                        {staff.employee_code}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                        {staff.department}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-wine text-gold flex items-center justify-center font-serif text-base font-bold shrink-0 shadow-sm border border-gold/30">
                        {staff.full_name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <h4 className="font-serif text-lg text-ink font-semibold leading-tight">{staff.full_name}</h4>
                        <p className="text-gold text-xs font-semibold mt-0.5">{staff.designation}</p>
                      </div>
                    </div>

                    {staff.notes && (
                      <p className="text-neutral-600 text-xs leading-relaxed bg-cream/40 p-3 rounded-xl border border-cream2/60">
                        {staff.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Lumière Staff Directory</span>
                    <span>Active</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

