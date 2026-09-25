-- Migration: Add logo_url, background_logo_enabled, background_logo_opacity, banner_url, font_family to public.restaurant_branding

ALTER TABLE public.restaurant_branding
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS background_logo_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS background_logo_opacity numeric(3,2) NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS font_family text NOT NULL DEFAULT 'Inter';

-- Update existing Lumière default branding record if logo_url is null
UPDATE public.restaurant_branding
SET background_logo_enabled = true,
    background_logo_opacity = 0.10
WHERE background_logo_enabled IS NULL OR background_logo_opacity IS NULL;
