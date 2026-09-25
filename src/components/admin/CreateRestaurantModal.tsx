"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Store, Plus, X, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { createRestaurant } from "@/actions/tenant";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (restaurantId: string, restaurantName: string) => void;
};

export function createSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except space and hyphen
    .trim()
    .replace(/[\s-]+/g, "-") // collapse spaces and hyphens into single hyphen
    .replace(/^-+|-+$/g, ""); // strip leading/trailing hyphens
}

export function CreateRestaurantModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ id: string; name: string; slug: string; city: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSlug("");
      setCity("");
      setPhone("");
      setEmail("");
      setIsSlugManuallyEdited(false);
      setError(null);
      setSuccessData(null);
    }
  }, [isOpen]);

  // Auto-generate slug from name if user hasn't manually edited it
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!isSlugManuallyEdited) {
      setSlug(createSlugFromName(newName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    // Normalize slug input
    const normalized = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-");
    setSlug(normalized);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();
    const cleanCity = city.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    // Client-side validations
    if (!cleanName) {
      setError("Restaurant name is required.");
      return;
    }

    if (!cleanSlug) {
      setError("Restaurant slug is required.");
      return;
    }

    if (cleanSlug.length < 3 || cleanSlug.length > 50) {
      setError("Restaurant slug must be between 3 and 50 characters.");
      return;
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleanSlug)) {
      setError("Slug must contain only lowercase letters, numbers, and hyphens.");
      return;
    }

    const reservedSlugs = ["admin", "api", "system", "auth", "public", "lumiere"];
    if (reservedSlugs.includes(cleanSlug)) {
      setError(`The slug "${cleanSlug}" is reserved. Please choose another.`);
      return;
    }

    if (!cleanCity) {
      setError("City / Location is required.");
      return;
    }

    startTransition(async () => {
      const res = await createRestaurant({
        name: cleanName,
        slug: cleanSlug,
        address: cleanCity,
        phone: cleanPhone || undefined,
        email: cleanEmail || undefined,
      });

      if (!res.ok) {
        setError(res.error || "Failed to create restaurant.");
      } else {
        setSuccessData({
          id: res.restaurantId,
          name: cleanName,
          slug: cleanSlug,
          city: cleanCity,
        });
        if (onSuccess) {
          onSuccess(res.restaurantId, cleanName);
        }
      }
    });
  };

  const handleContinueToDashboard = () => {
    onClose();
    // Hard refresh/redirect to reload layout with newly active tenant
    window.location.href = "/admin";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      <div className="bg-white border border-cream2 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-wine via-[#5c1c22] to-wine text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gold/20 text-gold shadow-2xs">
              <Store className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-serif font-bold text-lg text-white">Create New Restaurant</h2>
              <p className="text-xs text-neutral-300">Set up a new restaurant workspace on Lumière B2B</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {successData ? (
            /* Concise Success Experience */
            <div className="space-y-6 py-2 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto shadow-sm animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-ink">Restaurant Created</h3>
                <p className="text-xs text-neutral-500 mt-1">Your restaurant workspace is ready.</p>
              </div>

              <div className="bg-cream/60 border border-cream2 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between border-b border-cream2 pb-2">
                  <span className="text-xs text-neutral-500">Restaurant Name</span>
                  <span className="font-serif font-bold text-sm text-ink">{successData.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-cream2 pb-2 text-xs">
                  <span className="text-neutral-500">URL Slug</span>
                  <span className="font-mono text-wine font-semibold">{successData.slug}</span>
                </div>
                <div className="flex items-center justify-between border-b border-cream2 pb-2 text-xs">
                  <span className="text-neutral-500">Location</span>
                  <span className="font-medium text-neutral-800">{successData.city}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-neutral-500">Your Role</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-900 border border-amber-400/40">
                    👑 Owner
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueToDashboard}
                className="w-full py-3 px-4 bg-wine hover:bg-[#5e2329] text-white font-semibold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <span>Continue to Restaurant Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Creation Form */
            <form id="create-restaurant-form" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="font-semibold block text-rose-900">Creation Failed</strong>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Restaurant Name */}
              <div className="space-y-1.5">
                <label htmlFor="rest-name" className="block text-xs font-semibold text-neutral-700">
                  Restaurant Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="rest-name"
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Olive Garden Hyderabad"
                  disabled={isPending}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-wine text-ink transition shadow-2xs disabled:opacity-50"
                />
              </div>

              {/* Restaurant Slug */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="rest-slug" className="block text-xs font-semibold text-neutral-700">
                    Restaurant Slug <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">Lowercase letters, numbers, hyphens</span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-neutral-400 font-mono select-none">
                    /
                  </span>
                  <input
                    id="rest-slug"
                    type="text"
                    required
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="olive-garden-hyderabad"
                    disabled={isPending}
                    className="w-full pl-7 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono text-wine focus:bg-white focus:outline-none focus:ring-1 focus:ring-wine transition shadow-2xs disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-neutral-500">
                  Unique identifier used for workspace URL: <code className="text-wine font-semibold">lumiere.app/{slug || "slug"}</code>
                </p>
              </div>

              {/* City / Location */}
              <div className="space-y-1.5">
                <label htmlFor="rest-city" className="block text-xs font-semibold text-neutral-700">
                  City / Location <span className="text-rose-500">*</span>
                </label>
                <input
                  id="rest-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Jubilee Hills, Hyderabad"
                  disabled={isPending}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-wine text-ink transition shadow-2xs disabled:opacity-50"
                />
              </div>

              {/* Contact Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="rest-phone" className="block text-xs font-semibold text-neutral-700">
                    Contact Phone <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="rest-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    disabled={isPending}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-wine text-ink transition shadow-2xs disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="rest-email" className="block text-xs font-semibold text-neutral-700">
                    Contact Email <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="rest-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hyderabad@olivegarden.com"
                    disabled={isPending}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-wine text-ink transition shadow-2xs disabled:opacity-50"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!successData && (
          <div className="bg-neutral-50 border-t border-cream2 p-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-ink transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="create-restaurant-form"
              disabled={isPending || !name.trim() || !slug.trim() || !city.trim()}
              className="px-5 py-2.5 bg-wine hover:bg-[#5e2329] text-white font-semibold rounded-xl text-xs transition shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Restaurant...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Restaurant</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
