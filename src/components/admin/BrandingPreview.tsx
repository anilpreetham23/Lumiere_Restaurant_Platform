"use client";

import React from "react";
import { Utensils, Star, Sparkles } from "lucide-react";

type BrandingPreviewProps = {
  restaurantName: string;
  logo?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
};

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const DEFAULT_COLORS = {
  primary: "#7a2e35",
  secondary: "#16130f",
  accent: "#c8a24d",
  bg: "#ffffff",
};

function normalizeHexColor(raw: string, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (HEX_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback;
}

export default function BrandingPreview({
  restaurantName,
  logo,
  primaryColor,
  secondaryColor,
  accentColor,
  backgroundColor,
}: BrandingPreviewProps) {
  // Validate and normalize hex colors before injecting into style
  const safePrimary = normalizeHexColor(primaryColor, DEFAULT_COLORS.primary);
  const safeSecondary = normalizeHexColor(secondaryColor, DEFAULT_COLORS.secondary);
  const safeAccent = normalizeHexColor(accentColor, DEFAULT_COLORS.accent);
  const safeBg = normalizeHexColor(backgroundColor, DEFAULT_COLORS.bg);

  const displayName = restaurantName.trim() || "Your Restaurant";
  const initial = displayName.charAt(0).toUpperCase();

  const previewStyle = {
    "--preview-primary": safePrimary,
    "--preview-secondary": safeSecondary,
    "--preview-accent": safeAccent,
    "--preview-bg": safeBg,
  } as React.CSSProperties;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
        <span className="flex items-center gap-1.5 text-neutral-700 font-semibold">
          <Sparkles size={14} className="text-gold" />
          Live Customer View
        </span>
        <span className="bg-cream2 text-neutral-600 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold">
          Unsaved Changes Preview
        </span>
      </div>

      <div
        className="rounded-2xl border border-cream2 p-4 shadow-sm transition-all duration-300 space-y-4 overflow-hidden"
        style={{
          ...previewStyle,
          backgroundColor: "var(--preview-bg)",
          color: "var(--preview-secondary)",
        }}
      >
        {/* Mock Header */}
        <header
          className="flex items-center justify-between p-3 rounded-xl transition-colors duration-200"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.03)",
            borderColor: "var(--preview-accent)",
          }}
        >
          <div className="flex items-center gap-2.5">
            {logo && (logo.startsWith("http://") || logo.startsWith("https://") || logo.startsWith("/")) ? (
              <img
                src={logo}
                alt={`${displayName} logo`}
                className="w-8 h-8 rounded-full object-cover border"
                style={{ borderColor: "var(--preview-accent)" }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold font-serif shadow-xs"
                style={{
                  backgroundColor: "var(--preview-primary)",
                  color: "#ffffff",
                }}
              >
                {initial}
              </div>
            )}
            <span
              className="font-serif font-semibold text-base tracking-wide"
              style={{ color: "var(--preview-secondary)" }}
            >
              {displayName}
            </span>
          </div>

          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "var(--preview-accent)",
              color: "var(--preview-secondary)",
            }}
          >
            Open
          </span>
        </header>

        {/* Mock Menu Card */}
        <div
          className="rounded-xl p-3.5 border transition-all duration-200 shadow-xs space-y-2.5"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "rgba(0, 0, 0, 0.08)",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h4
                  className="font-serif font-semibold text-sm"
                  style={{ color: "var(--preview-secondary)" }}
                >
                  Signature Truffle Tagliatelle
                </h4>
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded"
                  style={{
                    backgroundColor: "var(--preview-accent)",
                    color: "var(--preview-secondary)",
                  }}
                >
                  <Star size={10} className="fill-current" />
                  Special
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                Handcrafted pasta, black winter truffle, aged Parmigiano Reggiano.
              </p>
            </div>
            <span
              className="font-serif font-bold text-sm whitespace-nowrap"
              style={{ color: "var(--preview-primary)" }}
            >
              $32.00
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Utensils size={12} />
              Chef&apos;s Recommendation
            </span>
            <button
              type="button"
              className="text-xs font-semibold px-3 py-1.2 rounded-full shadow-xs transition-transform active:scale-95 flex items-center gap-1"
              style={{
                backgroundColor: "var(--preview-primary)",
                color: "#ffffff",
              }}
            >
              Add to Order
            </button>
          </div>
        </div>

        {/* Palette Color Badges */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono text-center">
          <div className="p-1 rounded border border-black/5" style={{ backgroundColor: safePrimary, color: "#fff" }}>
            Primary
          </div>
          <div className="p-1 rounded border border-black/5" style={{ backgroundColor: safeSecondary, color: "#fff" }}>
            Secondary
          </div>
          <div className="p-1 rounded border border-black/5" style={{ backgroundColor: safeAccent, color: "#000" }}>
            Accent
          </div>
          <div className="p-1 rounded border border-black/5" style={{ backgroundColor: safeBg, color: "#000" }}>
            Background
          </div>
        </div>
      </div>
    </div>
  );
}
