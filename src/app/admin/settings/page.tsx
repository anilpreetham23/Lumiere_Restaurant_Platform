"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Loader2, Check, Lock, ShieldAlert, Palette, Building2, Sliders, Image as ImageIcon } from "lucide-react";
import BrandingPreview from "@/components/admin/BrandingPreview";
import {
  getAdminSettingsData,
  updateRestaurantProfile,
  updateRestaurantBranding,
  updateRestaurantSettings,
  type AdminSettingsData,
  type UpdateRestaurantProfileInput,
  type UpdateRestaurantBrandingInput,
  type UpdateRestaurantSettingsInput,
} from "@/actions/admin";

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [role, setRole] = useState<"owner" | "manager" | "staff">("staff");

  // Section 1: Profile State
  const [profile, setProfile] = useState<AdminSettingsData["profile"] | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Section 2: Branding State
  const [branding, setBranding] = useState<AdminSettingsData["branding"] | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);

  // Section 3: Operations Settings State
  const [settings, setSettings] = useState<AdminSettingsData["settings"] | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const isReadOnly = role === "staff";

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const res = await getAdminSettingsData();
    if (!res.ok) {
      setFetchError(res.error);
      setLoading(false);
      return;
    }

    setRole(res.data.role);
    setProfile(res.data.profile);
    setBranding(res.data.branding);
    setSettings(res.data.settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Section 1: Save Profile
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || isReadOnly || profileSaving) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);

    const input: UpdateRestaurantProfileInput = {
      name: profile.name,
      logo: profile.logo,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      postal_code: profile.postal_code,
    };

    const res = await updateRestaurantProfile(input);
    setProfileSaving(false);

    if (res.ok) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } else {
      setProfileError(res.error);
    }
  }

  // Section 2: Save Branding
  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!branding || isReadOnly || brandingSaving) return;

    setBrandingSaving(true);
    setBrandingError(null);
    setBrandingSaved(false);

    const input: UpdateRestaurantBrandingInput = {
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      accent_color: branding.accent_color,
      background_color: branding.background_color,
      logo_url: branding.logo_url ?? null,
      background_logo_enabled: branding.background_logo_enabled ?? true,
      background_logo_opacity: branding.background_logo_opacity ?? 0.10,
      banner_url: branding.banner_url ?? null,
      font_family: branding.font_family ?? "Inter",
      assets: branding.assets,
    };

    const res = await updateRestaurantBranding(input);
    setBrandingSaving(false);

    if (res.ok) {
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 3000);
    } else {
      setBrandingError(res.error);
    }
  }

  // Section 3: Save Settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings || isReadOnly || settingsSaving) return;

    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSaved(false);

    const input: UpdateRestaurantSettingsInput = {
      tagline: settings.tagline || undefined,
      hours: settings.hours || undefined,
      currency: settings.currency,
      deposit_amount: settings.deposit_amount,
      service_charge_pct: settings.service_charge_pct,
      payment_gateway: settings.payment_gateway,
      accepting_orders: settings.accepting_orders,
    };

    const res = await updateRestaurantSettings(input);
    setSettingsSaving(false);

    if (res.ok) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } else {
      setSettingsError(res.error);
    }
  }

  if (fetchError && !profile) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center max-w-xl mx-auto border border-cream2 space-y-3">
        <ShieldAlert size={36} className="mx-auto text-wine" />
        <h2 className="font-serif text-xl font-semibold">Unable to load settings</h2>
        <p className="text-sm text-neutral-500">{fetchError}</p>
        <button onClick={loadData} className="btn-outline text-xs py-1.5 px-4">
          Retry
        </button>
      </div>
    );
  }

  if (loading || !profile || !branding || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-3">
        <Loader2 className="animate-spin text-gold" size={28} />
        <span className="text-sm font-medium">Loading restaurant configuration…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">Restaurant Settings</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage your restaurant profile, visual branding palette, and operational controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">Role:</span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              role === "owner"
                ? "bg-wine/10 text-wine border border-wine/20"
                : role === "manager"
                ? "bg-gold/20 text-ink border border-gold/40"
                : "bg-neutral-100 text-neutral-600 border border-neutral-200"
            }`}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Staff Read-Only Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
          <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold block">Read-only view</span>
            Owner or Manager permissions required to edit configuration.
          </div>
        </div>
      )}

      {/* Main Grid: Forms + Branding Preview */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: The 3 Settings Sections */}
        <div className="lg:col-span-7 space-y-8">
          {/* SECTION 1 — RESTAURANT PROFILE */}
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-5">
            <div className="flex items-center justify-between border-b border-cream2 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cream text-wine">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-ink">Restaurant Profile</h2>
                  <p className="text-xs text-neutral-500">Public details and location metadata</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              {/* Read-only Slug & Status */}
              <div>
                <label className="block font-medium mb-1 text-neutral-600">Restaurant Slug (Read-only)</label>
                <input
                  type="text"
                  value={profile.slug}
                  disabled
                  readOnly
                  className="field bg-neutral-100 text-neutral-500 cursor-not-allowed font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-neutral-600">Account Status (Read-only)</label>
                <div className="field bg-neutral-100 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase font-semibold text-emerald-700">{profile.status}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Editable Name */}
              <div className="sm:col-span-2">
                <label htmlFor="profile-name" className="block font-medium mb-1 text-neutral-700">
                  Restaurant Name <span className="text-wine">*</span>
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profile.name}
                  disabled={isReadOnly}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="field font-medium text-sm"
                  placeholder="e.g. Lumiere Bistro"
                  required
                />
              </div>

              {/* Logo URL with Live Thumbnail */}
              <div className="sm:col-span-2">
                <label htmlFor="profile-logo" className="block font-medium mb-1 text-neutral-700">
                  Logo URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    id="profile-logo"
                    type="url"
                    value={profile.logo ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => setProfile({ ...profile, logo: e.target.value || null })}
                    className="field flex-1"
                    placeholder="https://example.com/logo.png"
                  />
                  <div className="w-10 h-10 rounded-xl border border-cream2 bg-cream grid place-items-center overflow-hidden shrink-0">
                    {profile.logo ? (
                      <img
                        src={profile.logo}
                        alt="Logo Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ImageIcon size={18} className="text-neutral-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Phone & Email */}
              <div>
                <label htmlFor="profile-phone" className="block font-medium mb-1 text-neutral-700">
                  Phone Number
                </label>
                <input
                  id="profile-phone"
                  type="text"
                  value={profile.phone ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value || null })}
                  className="field"
                  placeholder="+1 555-0199"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block font-medium mb-1 text-neutral-700">
                  Email Address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profile.email ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value || null })}
                  className="field"
                  placeholder="contact@restaurant.com"
                />
              </div>

              {/* Street Address */}
              <div className="sm:col-span-2">
                <label htmlFor="profile-address" className="block font-medium mb-1 text-neutral-700">
                  Street Address
                </label>
                <input
                  id="profile-address"
                  type="text"
                  value={profile.address ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value || null })}
                  className="field"
                  placeholder="123 Gourmet Way"
                />
              </div>

              {/* City & State */}
              <div>
                <label htmlFor="profile-city" className="block font-medium mb-1 text-neutral-700">
                  City
                </label>
                <input
                  id="profile-city"
                  type="text"
                  value={profile.city ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value || null })}
                  className="field"
                  placeholder="New York"
                />
              </div>

              <div>
                <label htmlFor="profile-state" className="block font-medium mb-1 text-neutral-700">
                  State / Province
                </label>
                <input
                  id="profile-state"
                  type="text"
                  value={profile.state ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value || null })}
                  className="field"
                  placeholder="NY"
                />
              </div>

              {/* Country & Postal Code */}
              <div>
                <label htmlFor="profile-country" className="block font-medium mb-1 text-neutral-700">
                  Country
                </label>
                <input
                  id="profile-country"
                  type="text"
                  value={profile.country ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value || null })}
                  className="field"
                  placeholder="USA"
                />
              </div>

              <div>
                <label htmlFor="profile-postal" className="block font-medium mb-1 text-neutral-700">
                  Postal Code
                </label>
                <input
                  id="profile-postal"
                  type="text"
                  value={profile.postal_code ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setProfile({ ...profile, postal_code: e.target.value || null })}
                  className="field"
                  placeholder="10001"
                />
              </div>
            </div>

            {profileError && <p className="text-xs text-wine font-medium">{profileError}</p>}

            {!isReadOnly && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="btn-wine justify-center text-xs py-2 px-5 disabled:opacity-60"
                >
                  {profileSaving ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : profileSaved ? (
                    <Check size={14} />
                  ) : null}
                  {profileSaved ? "Profile Saved" : "Save Profile"}
                </button>
                {profileSaved && <span className="text-xs text-emerald-600 font-semibold">Restaurant profile updated.</span>}
              </div>
            )}
          </form>

          {/* SECTION 2 — VISUAL BRANDING */}
          <form onSubmit={handleSaveBranding} className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-5">
            <div className="flex items-center justify-between border-b border-cream2 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cream text-gold">
                  <Palette size={18} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-ink">Visual Branding</h2>
                  <p className="text-xs text-neutral-500">Color palette for customer-facing menus and guest ordering</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              {/* Primary Color */}
              <div>
                <label htmlFor="branding-primary" className="block font-medium mb-1 text-neutral-700">
                  Primary Color (Headers/Buttons)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="branding-primary-picker"
                    value={HEX_REGEX.test(branding.primary_color) ? branding.primary_color : "#7a2e35"}
                    disabled={isReadOnly}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-cream2 cursor-pointer p-0.5 bg-white shrink-0"
                  />
                  <input
                    id="branding-primary"
                    type="text"
                    value={branding.primary_color}
                    disabled={isReadOnly}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="field uppercase font-mono text-xs"
                    placeholder="#7A2E35"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label htmlFor="branding-secondary" className="block font-medium mb-1 text-neutral-700">
                  Secondary Color (Text/Dark UI)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="branding-secondary-picker"
                    value={HEX_REGEX.test(branding.secondary_color) ? branding.secondary_color : "#16130f"}
                    disabled={isReadOnly}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-cream2 cursor-pointer p-0.5 bg-white shrink-0"
                  />
                  <input
                    id="branding-secondary"
                    type="text"
                    value={branding.secondary_color}
                    disabled={isReadOnly}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="field uppercase font-mono text-xs"
                    placeholder="#16130F"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label htmlFor="branding-accent" className="block font-medium mb-1 text-neutral-700">
                  Accent Color (Badges/Highlights)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="branding-accent-picker"
                    value={HEX_REGEX.test(branding.accent_color) ? branding.accent_color : "#c8a24d"}
                    disabled={isReadOnly}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-cream2 cursor-pointer p-0.5 bg-white shrink-0"
                  />
                  <input
                    id="branding-accent"
                    type="text"
                    value={branding.accent_color}
                    disabled={isReadOnly}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    className="field uppercase font-mono text-xs"
                    placeholder="#C8A24D"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label htmlFor="branding-bg" className="block font-medium mb-1 text-neutral-700">
                  Background Color (Surface Canvas)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="branding-bg-picker"
                    value={HEX_REGEX.test(branding.background_color) ? branding.background_color : "#ffffff"}
                    disabled={isReadOnly}
                    onChange={(e) => setBranding({ ...branding, background_color: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-cream2 cursor-pointer p-0.5 bg-white shrink-0"
                  />
                </div>
              </div>
            </div>

            {/* RESTAURANT LOGO & BRAND WATERMARK SECTION */}
            <div className="border-t border-cream2 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-semibold text-ink">Restaurant Logo & Watermark</h3>
                  <p className="text-xs text-neutral-500">Public logo identity and background watermark treatment</p>
                </div>
                {branding.logo_url && branding.logo_url !== "/Shinchan.jpg" && (
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setBranding({ ...branding, logo_url: "/Shinchan.jpg" })}
                    className="text-xs text-wine hover:underline font-medium cursor-pointer"
                  >
                    Reset to Default Logo
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-xs items-start">
                {/* Logo Preview Card */}
                <div className="bg-cream/60 rounded-xl p-3 border border-cream2 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-xl bg-white border border-amber-200/60 p-1 flex items-center justify-center shadow-xs overflow-hidden mb-2">
                    <img
                      src={branding.logo_url || "/Shinchan.jpg"}
                      alt="Restaurant Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/Shinchan.jpg";
                      }}
                    />
                  </div>
                  <span className="text-[0.68rem] font-semibold text-neutral-700">{profile?.name}</span>
                  <span className="text-[0.6rem] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full mt-1">
                    {(!branding.logo_url || branding.logo_url === "/Shinchan.jpg") ? "Default Logo" : "Custom Logo"}
                  </span>
                </div>

                {/* Logo URL Input */}
                <div className="sm:col-span-2 space-y-3">
                  <div>
                    <label htmlFor="branding-logo-url" className="block font-medium mb-1 text-neutral-700">
                      Custom Logo URL
                    </label>
                    <input
                      id="branding-logo-url"
                      type="text"
                      value={branding.logo_url ?? ""}
                      disabled={isReadOnly}
                      onChange={(e) => setBranding({ ...branding, logo_url: e.target.value || null })}
                      className="field font-mono text-xs"
                      placeholder="https://example.com/logo.png or /Shinchan.jpg"
                    />
                    <p className="text-[0.65rem] text-neutral-400 mt-1">
                      PNG, JPG, WebP, SVG supported. Leave empty to use default Shinchan logo.
                    </p>
                  </div>

                  {/* Background Watermark Controls */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        id="branding-watermark-enabled"
                        type="checkbox"
                        checked={branding.background_logo_enabled ?? true}
                        disabled={isReadOnly}
                        onChange={(e) => setBranding({ ...branding, background_logo_enabled: e.target.checked })}
                        className="rounded border-cream2 text-wine focus:ring-wine h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="branding-watermark-enabled" className="text-xs font-medium text-neutral-700 cursor-pointer">
                        Public Background Watermark
                      </label>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="branding-opacity" className="text-xs font-medium text-neutral-700">
                          Opacity: {Math.round((branding.background_logo_opacity ?? 0.10) * 100)}%
                        </label>
                      </div>
                      <input
                        id="branding-opacity"
                        type="range"
                        min="0.01"
                        max="0.50"
                        step="0.01"
                        value={branding.background_logo_opacity ?? 0.10}
                        disabled={isReadOnly || !(branding.background_logo_enabled ?? true)}
                        onChange={(e) => setBranding({ ...branding, background_logo_opacity: parseFloat(e.target.value) })}
                        className="w-full accent-wine cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* In-page preview for small/medium screens */}
            <div className="lg:hidden pt-2">
              <BrandingPreview
                restaurantName={profile.name}
                logo={profile.logo}
                primaryColor={branding.primary_color}
                secondaryColor={branding.secondary_color}
                accentColor={branding.accent_color}
                backgroundColor={branding.background_color}
              />
            </div>

            {brandingError && <p className="text-xs text-wine font-medium">{brandingError}</p>}

            {!isReadOnly && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={brandingSaving}
                  className="btn-gold justify-center text-xs py-2 px-5 disabled:opacity-60"
                >
                  {brandingSaving ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : brandingSaved ? (
                    <Check size={14} />
                  ) : null}
                  {brandingSaved ? "Branding Saved" : "Save Branding"}
                </button>
                {brandingSaved && <span className="text-xs text-emerald-600 font-semibold">Branding updated.</span>}
              </div>
            )}
          </form>

          {/* SECTION 3 — OPERATIONS & ORDERING */}
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-5">
            <div className="flex items-center justify-between border-b border-cream2 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cream text-ink">
                  <Sliders size={18} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-ink">Operations & Ordering</h2>
                  <p className="text-xs text-neutral-500">Live ordering rules, payments, and service charges</p>
                </div>
              </div>
            </div>

            {/* Accepting Orders Kill Switch */}
            <div className="flex items-center justify-between bg-cream/50 rounded-xl p-3.5 border border-cream2">
              <div>
                <div className="font-medium text-xs sm:text-sm text-ink">Accepting Orders</div>
                <div className="text-[11px] text-neutral-500">Turn off to pause all QR ordering instantly across tables.</div>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setSettings({ ...settings, accepting_orders: !settings.accepting_orders })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.accepting_orders ? "bg-emerald-500" : "bg-neutral-300"
                } ${isReadOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-xs ${
                    settings.accepting_orders ? "left-6" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              {/* Tagline */}
              <div className="sm:col-span-2">
                <label htmlFor="settings-tagline" className="block font-medium mb-1 text-neutral-700">
                  Tagline
                </label>
                <input
                  id="settings-tagline"
                  type="text"
                  value={settings.tagline ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="field"
                  placeholder="Exquisite Culinary Artistry"
                />
              </div>

              {/* Hours */}
              <div>
                <label htmlFor="settings-hours" className="block font-medium mb-1 text-neutral-700">
                  Opening Hours
                </label>
                <input
                  id="settings-hours"
                  type="text"
                  value={settings.hours ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => setSettings({ ...settings, hours: e.target.value })}
                  className="field"
                  placeholder="12:00 PM - 11:00 PM"
                />
              </div>

              {/* Currency ISO Code */}
              <div>
                <label htmlFor="settings-currency" className="block font-medium mb-1 text-neutral-700">
                  Currency (3-Letter Code)
                </label>
                <input
                  id="settings-currency"
                  type="text"
                  maxLength={3}
                  value={settings.currency}
                  disabled={isReadOnly}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
                  className="field uppercase font-mono"
                  placeholder="USD"
                  required
                />
              </div>

              {/* Deposit Amount */}
              <div>
                <label htmlFor="settings-deposit" className="block font-medium mb-1 text-neutral-700">
                  Reservation Deposit Amount
                </label>
                <input
                  id="settings-deposit"
                  type="number"
                  min={0}
                  step={0.01}
                  value={settings.deposit_amount}
                  disabled={isReadOnly}
                  onChange={(e) => setSettings({ ...settings, deposit_amount: Math.max(0, Number(e.target.value)) })}
                  className="field font-mono"
                />
              </div>

              {/* Service Charge % */}
              <div>
                <label htmlFor="settings-service" className="block font-medium mb-1 text-neutral-700">
                  Service Charge (%)
                </label>
                <input
                  id="settings-service"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={settings.service_charge_pct}
                  disabled={isReadOnly}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      service_charge_pct: Math.min(100, Math.max(0, Number(e.target.value))),
                    })
                  }
                  className="field font-mono"
                />
              </div>

              {/* Payment Gateway */}
              <div className="sm:col-span-2">
                <label htmlFor="settings-gateway" className="block font-medium mb-1 text-neutral-700">
                  Payment Gateway
                </label>
                <select
                  id="settings-gateway"
                  value={settings.payment_gateway}
                  disabled={isReadOnly}
                  onChange={(e) =>
                    setSettings({ ...settings, payment_gateway: e.target.value as "razorpay" | "stripe" })
                  }
                  className="field"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
            </div>

            {settingsError && <p className="text-xs text-wine font-medium">{settingsError}</p>}

            {!isReadOnly && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="btn-wine justify-center text-xs py-2 px-5 disabled:opacity-60"
                >
                  {settingsSaving ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : settingsSaved ? (
                    <Check size={14} />
                  ) : null}
                  {settingsSaved ? "Settings Saved" : "Save Settings"}
                </button>
                {settingsSaved && <span className="text-xs text-emerald-600 font-semibold">Settings updated.</span>}
              </div>
            )}
          </form>
        </div>

        {/* Right 5 Columns: Desktop Sticky Branding Preview */}
        <div className="hidden lg:block lg:col-span-5 sticky top-24">
          <BrandingPreview
            restaurantName={profile.name}
            logo={profile.logo}
            primaryColor={branding.primary_color}
            secondaryColor={branding.secondary_color}
            accentColor={branding.accent_color}
            backgroundColor={branding.background_color}
          />
        </div>
      </div>
    </div>
  );
}
