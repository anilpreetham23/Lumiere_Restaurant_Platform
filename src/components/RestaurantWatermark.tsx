"use client";

import { useState } from "react";

interface RestaurantWatermarkProps {
  logoUrl?: string | null;
  enabled?: boolean;
  opacity?: number;
  restaurantName?: string;
}

export default function RestaurantWatermark({
  logoUrl,
  enabled = true,
  opacity = 0.10,
  restaurantName = "Restaurant",
}: RestaurantWatermarkProps) {
  const [imgError, setImgError] = useState(false);

  if (enabled === false) return null;

  const displayLogo = !imgError && logoUrl && logoUrl.trim() ? logoUrl.trim() : "/Shinchan.jpg";
  const safeOpacity = typeof opacity === "number" && !isNaN(opacity) && opacity >= 0 && opacity <= 1 ? opacity : 0.10;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none"
      aria-hidden="true"
    >
      <img
        src={displayLogo}
        alt=""
        style={{ opacity: safeOpacity }}
        onError={() => setImgError(true)}
        className="w-[480px] h-[480px] max-w-[70vw] max-h-[70vh] object-contain filter grayscale contrast-125 transition-opacity duration-300 pointer-events-none"
      />
    </div>
  );
}
