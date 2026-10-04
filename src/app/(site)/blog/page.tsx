"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { User, ArrowRight, Clock, BookOpen, X } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { JournalPost, getJournalPostsAction } from "@/actions/journal";

export default function BlogPage() {
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<JournalPost | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getJournalPostsAction(false);
      setPosts(data);
      setLoading(false);
    }
    load();
  }, []);

  // Lock body scroll when story modal is active
  useEffect(() => {
    if (selectedPost) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPost]);

  return (
    <>
      <PageHero
        label="The Journal"
        title="Stories from the Pass"
        sub="Provenance, spice routes, royal recipes, and the people behind the plates."
      />

      <section className="py-20 bg-cream min-h-[60vh]">
        <div className="mx-auto max-w-6xl px-5">
          {loading ? (
            <div className="py-20 text-center font-serif text-wine">
              <BookOpen className="w-10 h-10 mx-auto animate-pulse mb-3 text-gold" />
              <p className="text-lg">Unrolling ancient recipes...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center font-serif text-neutral-500">
              <p className="text-xl">Our khansamas are currently crafting new stories.</p>
              <p className="text-xs text-neutral-400 mt-2">Check back soon for upcoming culinary notes.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, i) => (
                <Reveal key={post.id} delay={i * 0.08}>
                  <article className="group rounded-2xl overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-neutral-100">
                    {/* Image Header */}
                    <div className="relative h-56 overflow-hidden bg-neutral-900">
                      <Image
                        src={post.image_url || "/img/blog/1.jpg"}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <span className="absolute top-4 left-4 bg-wine/90 backdrop-blur-xs text-white text-[0.65rem] px-3.5 py-1.5 rounded-full uppercase tracking-widest font-medium shadow-sm">
                        {post.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-7 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <h3 className="font-serif text-xl font-bold text-ink leading-snug group-hover:text-wine transition">
                          {post.title}
                        </h3>
                        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">
                          {post.excerpt}
                        </p>
                      </div>

                      {/* Footer Details & Reader Button */}
                      <div className="pt-4 border-t border-neutral-100 space-y-4">
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                            <User size={13} className="text-wine" /> {post.author_name}
                          </span>
                          <span className="flex items-center gap-1 text-neutral-400">
                            <Clock size={13} className="text-gold" /> {post.read_time || "4 min read"}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedPost(post)}
                          className="w-full py-2.5 px-4 bg-cream text-wine font-semibold text-xs rounded-xl hover:bg-wine hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                        >
                          <span>Read Full Story</span>
                          <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reader Modal Overlay */}
      {selectedPost && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPost(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-neutral-200 p-6 md:p-8 space-y-6 relative custom-scrollbar">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-6 right-6 p-2.5 bg-white/80 hover:bg-wine hover:text-white rounded-full transition text-neutral-700 z-20 shadow-md border border-neutral-200/50"
              title="Close Story"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Image Header */}
            <div className="relative h-64 md:h-80 -mx-6 -mt-6 md:-mx-8 md:-mt-8 overflow-hidden rounded-t-3xl">
              <Image
                src={selectedPost.image_url || "/img/blog/1.jpg"}
                alt={selectedPost.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                <span className="bg-gold text-ink text-[0.65rem] px-3 py-1 rounded-full uppercase tracking-wider font-bold shadow-xs">
                  {selectedPost.category}
                </span>
                <h2 className="font-serif text-2xl md:text-3xl font-bold leading-tight drop-shadow-md">
                  {selectedPost.title}
                </h2>
              </div>
            </div>

            {/* Author Meta */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 text-xs text-neutral-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-wine/10 text-wine flex items-center justify-center font-serif font-bold text-sm border border-wine/20">
                  {selectedPost.author_name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-ink text-sm">{selectedPost.author_name}</div>
                  <div className="text-[11px] text-neutral-400">{selectedPost.author_role || "Lumière Khansama"}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
                <Clock className="w-4 h-4 text-gold" />
                <span>{selectedPost.read_time || "5 min read"}</span>
              </div>
            </div>

            {/* Post Excerpt Highlight */}
            <div className="p-4 bg-cream/80 rounded-2xl border-l-4 border-wine text-ink text-sm font-serif italic leading-relaxed">
              "{selectedPost.excerpt}"
            </div>

            {/* Main Content Body */}
            <div className="text-neutral-800 text-sm md:text-base leading-relaxed space-y-4 font-sans whitespace-pre-line pr-1">
              {selectedPost.content}
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-serif">Lumière Royal Fine Dining • The Journal</span>
              <button
                onClick={() => setSelectedPost(null)}
                className="px-6 py-2.5 bg-wine text-white text-xs font-semibold rounded-xl hover:bg-wine-dark transition shadow-md"
              >
                Close Story
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
