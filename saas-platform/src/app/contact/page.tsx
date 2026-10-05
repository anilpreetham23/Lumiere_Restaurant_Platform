"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import {
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    restaurantName: "",
    outlets: "1 Outlet",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageWrapper>
      {/* HEADER */}
      <section className="py-12 bg-navy-950/80 border-b border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-mono font-semibold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dedicated Enterprise & Sales Support</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">
            Schedule a 1-on-1 Product Walkthrough
          </h1>
          <p className="text-slate-300 text-base max-w-2xl mx-auto font-light">
            Our restaurant system specialists will demonstrate live reservation deposits, KDS bump bars, and multi-outlet inventory tailored to your venue.
          </p>
        </div>
      </section>

      {/* FORM & INFO GRID */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* CONTACT INFO COL */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <h2 className="font-serif text-3xl font-bold text-white">Get in Touch</h2>
              <p className="text-slate-300 text-sm leading-relaxed font-light">
                Have questions regarding hardware compatibility, custom payment gateways, or multi-outlet franchisee pricing? Reach out to our Bengaluru headquarters directly.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Lumière B2B SaaS HQ</div>
                  <div className="text-slate-400 text-xs mt-1">12 MG Road, Indiranagar, Bengaluru, KA 560038, India</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Priority Sales & Onboarding Hotline</div>
                  <div className="text-slate-300 font-mono text-xs mt-1">+91 93465 43338</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Mon - Sun &middot; 9:00 AM - 10:00 PM IST</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Email Inquiries</div>
                  <div className="text-slate-300 font-mono text-xs mt-1">saas-support@lumiere.com</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Guaranteed response within 2 hours</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-wine/10 border border-wine/30 space-y-2">
              <div className="text-gold font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Enterprise SLA Guarantee</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Dedicated database isolation, 99.99% uptime SLA, and 24/7 emergency WhatsApp support for Growth and Enterprise plan clients.
              </p>
            </div>
          </div>

          {/* DEMO BOOKING FORM COL */}
          <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            {submitted ? (
              <div className="py-16 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-3xl font-bold text-white">Demo Request Received!</h3>
                <p className="text-slate-300 text-sm max-w-md mx-auto font-light">
                  Thank you, <span className="text-gold font-semibold">{formData.name}</span>. Our senior restaurant solution consultant will reach out to <span className="text-white font-mono">{formData.email}</span> within 2 hours to confirm your walkthrough.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setSubmitted(false)}
                    className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl font-bold text-white">Request a Personalized Demo</h3>
                  <p className="text-slate-400 text-xs">Fill in your details below and our team will prepare a customized live sandbox.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Chef Vikram Seth"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Business Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="vikram@restaurant.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Phone / WhatsApp Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Number of Outlets</label>
                    <select
                      value={formData.outlets}
                      onChange={(e) => setFormData({ ...formData, outlets: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-gold"
                    >
                      <option value="1 Outlet">1 Single Outlet</option>
                      <option value="2-5 Outlets">2 - 5 Outlets</option>
                      <option value="6-15 Outlets">6 - 15 Outlets</option>
                      <option value="15+ Outlets">15+ Franchise Chain</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Restaurant Name & Operational Requirements</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your cuisine, peak seating capacity, or specific POS & KDS requirements..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-gold w-full py-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-gold/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Demo Request</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
