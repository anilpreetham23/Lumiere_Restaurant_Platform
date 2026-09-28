"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Dish } from "@/data/menu";
import MenuCard from "./MenuCard";

export default function MenuBrowser({ initial = "All", dishes }: { initial?: string; dishes: Dish[] }) {
  const categories = useMemo(() => {
    const set = new Set(dishes.map((d) => d.cuisine).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [dishes]);

  const [active, setActive] = useState<string>(categories.includes(initial) ? initial : "All");
  const list = active === "All" ? dishes : dishes.filter((d) => d.cuisine === active);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              active === c
                ? "bg-wine text-white shadow"
                : "bg-cream2 text-neutral-600 hover:bg-gold hover:text-ink"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {list.map((d) => (
            <MenuCard key={d.id} dish={d} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
