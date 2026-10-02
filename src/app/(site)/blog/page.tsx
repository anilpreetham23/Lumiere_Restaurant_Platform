import type { Metadata } from "next";
import Image from "next/image";
import { User, ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Journal",
  description: "Stories from the Lumière kitchen — royal recipes, spice routes, and life behind the pass.",
};

const POSTS = [
  ["/img/blog/1.jpg", "Kitchen Stories", "Secrets of Lucknow: The Art of Dum Pukht Cooking", "A morning spice grinding ritual, sealed clay handis, and the slow-cooking secrets of Awadhi khansamas.", "Chef Rajesh Verma", "14 Mar"],
  ["/img/blog/2.jpg", "Spice Route", "Spices of Kerala: A Journey Through the Pepper Coast", "Chasing Idukki green cardamom, Tellicherry black pepper, and nutmeg from Kerala spice gardens.", "Chef Priya Sundaram", "28 Feb"],
  ["/img/blog/3.jpg", "Royal Desserts", "The Craft of Saffron & Silver Leaf Mithai", "How our master confectioners slow-simmer Rabri and craft golden Shahi Tukda with edible silver vark.", "Chef Vikram Malhotra", "05 Jan"],
];

export default function BlogPage() {
  return (
    <>
      <PageHero label="The Journal" title="Stories from the Kitchen" sub="Provenance, pairings and the people behind the plates." />
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-6xl px-5 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {POSTS.map(([img, tag, title, excerpt, author, date], i) => (
            <Reveal key={title} delay={i * 0.06}>
              <article className="group rounded-2xl overflow-hidden bg-cream shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-lg transition">
                <div className="relative h-52 overflow-hidden">
                  <Image src={img} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
                  <span className="absolute top-3 left-3 bg-wine text-white text-[0.65rem] px-3 py-1 rounded-full uppercase tracking-wide">{tag}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl leading-snug group-hover:text-wine transition">{title}</h3>
                  <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{excerpt}</p>
                  <div className="flex items-center justify-between mt-4 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><User size={12} /> {author}</span>
                    <span>{date}</span>
                  </div>
                  <button className="mt-4 text-sm font-medium text-wine flex items-center gap-1">
                    Read More <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
