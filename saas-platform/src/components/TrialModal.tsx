"use client";

import React, { useState } from "react";
import { X, Sparkles, CheckCircle2, Building2, User, Mail, Phone, MapPin } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: string;
}

export default function TrialModal({ isOpen, onClose, selectedPlan = "Growth Fine Dining" }: Props) {
  const [form, setForm] = useState({
    restaurant_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    outlets: "1",
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-navy-900 border border-gold/30 rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-8 relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-gold/10 text-gold border border-gold/20 text-[10px] font-bold uppercase px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plan Selected: {selectedPlan}</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-white">Start Your 14-Day Free SaaS Trial</h2>
          <p className="text-xs text-slate-400">
            Provision your restaurant workspace in under 2 minutes. No credit card required.
          </p>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-white">Workspace Created!</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your 14-day trial for <span className="font-bold text-gold">{form.restaurant_name}</span> has been provisioned. We have dispatched login setup instructions to <span className="font-mono text-wine-light font-bold">{form.email}</span>.
            </p>
            <a
              href="http://localhost:3000/admin"
              target="_blank"
              rel="noreferrer"
              className="btn-gold w-full justify-center text-xs font-bold py-3.5 rounded-xl block text-center mt-4"
            >
              Launch Admin Dashboard Workspace
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Restaurant / Brand Name *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Spice Fine Dining"
                  value={form.restaurant_name}
                  onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700 focus:border-gold rounded-xl text-xs text-white focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Your Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Chef Rajesh"
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700 focus:border-gold rounded-xl text-xs text-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">City / State *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Bengaluru"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700 focus:border-gold rounded-xl text-xs text-white focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Work Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="owner@restaurant.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700 focus:border-gold rounded-xl text-xs text-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="+91 93465 43338"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700 focus:border-gold rounded-xl text-xs text-white focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-gold w-full py-3.5 rounded-xl text-xs font-bold shadow-lg transition"
            >
              Provision SaaS Workspace
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
