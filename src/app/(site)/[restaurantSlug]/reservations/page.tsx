import { Clock, Phone, Users, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ReservationForm from "@/components/ReservationForm";
import RestaurantWatermark from "@/components/RestaurantWatermark";
import RestaurantLogoHeader from "@/components/RestaurantLogoHeader";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicRestaurantBySlug } from "@/lib/tenant";
import { confirmReservationDeposit } from "@/actions/pay";
import type { MenuItem } from "@/lib/order";

export const dynamic = "force-dynamic";

const INFO: [React.ReactNode, string, string][] = [
  [<Clock size={18} key="c" />, "Opening Hours", "Mon - Sun, 12pm - 11pm"],
  [<Phone size={18} key="p" />, "Call for Booking", "Direct Reservations"],
  [<Users size={18} key="u" />, "Private Dining", "Bespoke menus for parties of 10+"],
  [<MapPin size={18} key="m" />, "Location", "Table Reservations"],
];

export default async function PublicRestaurantReservationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantSlug: string }>;
  searchParams: Promise<{ dep?: string; rid?: string; intent_id?: string; cs?: string }>;
}) {
  const { restaurantSlug } = await params;
  const { dep, rid, intent_id, cs } = await searchParams;

  const restaurant = await resolvePublicRestaurantBySlug(restaurantSlug);

  if (!restaurant) {
    return (
      <>
        <PageHero label="Reservations" title="Restaurant Not Found" sub="The restaurant link you followed is invalid or currently inactive." />
        <section className="py-16 bg-cream">
          <div className="mx-auto max-w-xl px-5 text-center">
            <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-4">
              <AlertCircle size={48} className="text-amber-600 mx-auto" />
              <h3 className="font-serif text-2xl text-ink">Invalid or Inactive Restaurant</h3>
              <p className="text-neutral-600 text-sm">
                We could not locate an active restaurant matching &quot;{restaurantSlug}&quot;. Please check the URL or contact the restaurant directly.
              </p>
            </div>
          </div>
        </section>
      </>
    );
  }

  let depositPaid = false;
  let verificationPending = false;
  if (dep === "1" && rid && (cs || intent_id)) {
    const res = await confirmReservationDeposit(rid, cs ?? "", intent_id);
    if (res.ok) {
      depositPaid = true;
    } else {
      verificationPending = true;
    }
  }

  const logoUrl = restaurant.branding?.logo_url || restaurant.logo || "/Shinchan.jpg";
  const watermarkEnabled = restaurant.branding?.background_logo_enabled ?? true;
  const watermarkOpacity = restaurant.branding?.background_logo_opacity ?? 0.10;

  return (
    <div className="relative">
      <RestaurantWatermark
        logoUrl={logoUrl}
        enabled={watermarkEnabled}
        opacity={watermarkOpacity}
        restaurantName={restaurant.name}
      />
      <div className="relative z-10">
        <PageHero
          label={`Book a Table at ${restaurant.name}`}
          title={`Make a Reservation`}
          sub={`Reserve your place at ${restaurant.name}. For weekend evenings we recommend booking 24 hours in advance.`}
        />
        <section className="py-16 bg-cream/90 backdrop-blur-xs">
          {depositPaid && (
            <div className="mx-auto max-w-6xl px-5 mb-8">
              <div className="flex items-center gap-3 bg-green-50 border border-green-300 text-green-800 rounded-2xl p-4 text-sm font-medium">
                <CheckCircle2 size={22} className="shrink-0" /> Deposit received — your table reservation at {restaurant.name} is confirmed. A confirmation email is on its way.
              </div>
            </div>
          )}
          {verificationPending && !depositPaid && (
            <div className="mx-auto max-w-6xl px-5 mb-8">
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-2xl p-4 text-sm font-medium">
                <Clock size={22} className="shrink-0 animate-pulse" /> Deposit payment submitted — awaiting bank webhook verification to confirm table reservation.
              </div>
            </div>
          )}
          <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-3 gap-8">
            <Reveal>
              <div className="bg-ink text-white rounded-2xl p-8 h-full flex flex-col justify-between">
                <div>
                  <RestaurantLogoHeader logoUrl={logoUrl} name={restaurant.name} className="mb-6 items-start" size="md" />
                  <h3 className="font-serif text-2xl mb-2">{restaurant.name}</h3>
                  <p className="text-white/50 text-sm mb-8">We are happy to help you plan the perfect dining experience.</p>
                  <div className="space-y-6">
                    {INFO.map(([icon, t, d]) => (
                      <div key={t} className="flex gap-3">
                        <span className="grid place-items-center w-11 h-11 rounded-xl bg-wine/30 text-gold shrink-0">{icon}</span>
                        <div>
                          <div className="text-[0.68rem] uppercase tracking-widest text-white/50">{t}</div>
                          <div className="text-sm">{d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
            <div className="lg:col-span-2">
              <Reveal delay={0.1}>
                <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-cream2">
                  <h3 className="font-serif text-2xl text-ink mb-1">Reservation Details</h3>
                  <p className="text-xs text-neutral-500 mb-6">Select date, time, and party size to check table availability.</p>
                  <ReservationForm restaurantSlug={restaurant.slug} restaurantName={restaurant.name} />
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
