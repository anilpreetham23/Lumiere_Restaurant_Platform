"use client";

import { useState } from "react";

interface RestaurantLogoHeaderProps {
  logoUrl?: string | null;
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function RestaurantLogoHeader({
  logoUrl,
  name,
  className = "",
  size = "md",
}: RestaurantLogoHeaderProps) {
  const [imgError, setImgError] = useState(false);

  const displayLogo = !imgError && logoUrl && logoUrl.trim() ? logoUrl.trim() : "/Shinchan.jpg";
  const isDefaultLogo = displayLogo === "/Shinchan.jpg";

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className={`relative rounded-2xl overflow-hidden border border-amber-200/50 bg-white p-2 shadow-lg ${sizeClasses[size]}`}>
        <img
          src={displayLogo}
          alt={`${name} Logo`}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain rounded-xl"
        />
      </div>
      {isDefaultLogo && (
        <span className="inline-block text-[0.65rem] tracking-wider uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-medium shadow-xs">
          Default Brand Logo
        </span>
      )}
    </div>
  );
}
