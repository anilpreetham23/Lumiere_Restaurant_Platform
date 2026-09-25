"use client";

import React, { useState } from "react";
import { Store, Plus, LogOut } from "lucide-react";
import { CreateRestaurantModal } from "@/components/admin/CreateRestaurantModal";
import AdminLogout from "@/components/AdminLogout";

type Props = {
  userEmail?: string | null;
};

export function NoActiveRestaurantFallback({ userEmail }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf8f5] grid place-items-center px-5 py-12">
      <div className="bg-white border border-cream2 rounded-2xl p-8 max-w-md w-full text-center shadow-lg space-y-6">
        <div className="w-16 h-16 rounded-full bg-wine/10 text-wine grid place-items-center mx-auto shadow-xs">
          <Store className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold text-ink">Welcome to Lumière B2B</h1>
          <p className="text-xs text-neutral-500">
            You don't have access to an active restaurant workspace yet. Create your restaurant or request access from your administrator.
          </p>
          {userEmail && (
            <p className="text-[11px] font-mono text-neutral-400 pt-1">
              Logged in as: <strong className="text-neutral-700">{userEmail}</strong>
            </p>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full py-3 px-4 bg-wine hover:bg-[#5e2329] text-white font-semibold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-gold" />
            <span>Create Your First Restaurant</span>
          </button>

          <div className="pt-2">
            <AdminLogout />
          </div>
        </div>
      </div>

      <CreateRestaurantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
