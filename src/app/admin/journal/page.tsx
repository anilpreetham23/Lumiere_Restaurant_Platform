"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  User,
  Clock,
  Tag,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
} from "lucide-react";
import {
  JournalPost,
  getJournalPostsAction,
  createJournalPostAction,
  updateJournalPostAction,
  deleteJournalPostAction,
  togglePublishJournalPostAction,
} from "@/actions/journal";
import { uploadRestaurantAssetAction } from "@/actions/admin";

const CATEGORIES = ["Kitchen Stories", "Spice Route", "Royal Desserts", "Heritage & Craft", "Press & Awards"];

export default function AdminJournalPage() {
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<JournalPost | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Kitchen Stories",
    excerpt: "",
    content: "",
    author_name: "Chef Rajesh Verma",
    author_role: "Executive Khansama",
    image_url: "/img/blog/1.jpg",
    read_time: "5 min read",
    published: true,
  });

  const loadPosts = async () => {
    setLoading(true);
    const data = await getJournalPostsAction(true);
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      category: "Kitchen Stories",
      excerpt: "",
      content: "",
      author_name: "Chef Rajesh Verma",
      author_role: "Executive Khansama",
      image_url: "/img/blog/1.jpg",
      read_time: "5 min read",
      published: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: JournalPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      category: post.category,
      excerpt: post.excerpt,
      content: post.content,
      author_name: post.author_name,
      author_role: post.author_role || "Culinary Team",
      image_url: post.image_url,
      read_time: post.read_time || "4 min read",
      published: post.published,
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadRestaurantAssetAction(fd);
      if (res.ok) {
        setFormData((prev) => ({ ...prev, image_url: res.url }));
        setStatusMessage({ type: "success", text: "Image uploaded successfully!" });
      } else {
        setStatusMessage({ type: "error", text: (res as any).error || "Failed to upload image." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Upload error" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      fd.append(k, String(v));
    });

    try {
      let res;
      if (editingPost) {
        res = await updateJournalPostAction(editingPost.id, fd);
      } else {
        res = await createJournalPostAction(fd);
      }

      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: editingPost ? "Journal article updated successfully!" : "New Journal article published!",
        });
        setIsModalOpen(false);
        // Local state update for immediate feedback
        if (editingPost) {
          setPosts((prev) =>
            prev.map((p) => (p.id === editingPost.id ? { ...p, ...formData } : p))
          );
        } else if ((res as any).post) {
          setPosts((prev) => [(res as any).post, ...prev]);
        }
        await loadPosts();
      } else {
        setStatusMessage({ type: "error", text: res.error || "Operation failed." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "An error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (post: JournalPost) => {
    const nextState = !post.published;
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, published: nextState } : p))
    );
    const res = await togglePublishJournalPostAction(post.id, nextState);
    if (!res.ok) {
      setStatusMessage({ type: "error", text: "Failed to update publish state." });
      await loadPosts();
    } else {
      setStatusMessage({
        type: "success",
        text: `Article is now ${nextState ? "published" : "saved as draft"}.`,
      });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const res = await deleteJournalPostAction(id);
    if (!res.ok) {
      setStatusMessage({ type: "error", text: "Failed to delete post." });
      await loadPosts();
    } else {
      setStatusMessage({ type: "success", text: "Journal article removed." });
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.length - publishedCount;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-wine to-wine-dark p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-gold font-medium text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Editorial & Storytelling</span>
          </div>
          <h1 className="font-serif text-3xl font-bold">Journal Articles & Stories</h1>
          <p className="text-cream/80 text-sm max-w-xl">
            Manage public Journal stories, culinary provenance, kitchen secrets, and royal heritage blogs.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="relative z-10 px-5 py-3 bg-gold hover:bg-gold-light text-ink font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Write New Article</span>
        </button>

        {/* Decorative pattern */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border shadow-xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-black/5 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-wine/10 text-wine rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">{posts.length}</div>
            <div className="text-xs text-neutral-500 font-medium">Total Stories</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{publishedCount}</div>
            <div className="text-xs text-neutral-500 font-medium">Published Live</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <EyeOff className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-700">{draftCount}</div>
            <div className="text-xs text-neutral-500 font-medium">Draft Articles</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search stories by title, excerpt or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {["All", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-wine text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="py-16 text-center text-neutral-400 font-serif">
          <BookOpen className="w-10 h-10 mx-auto animate-pulse mb-2 text-wine" />
          <p>Loading Journal stories...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-lg font-serif font-bold text-ink">No Stories Found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            No articles match your current search or category filter. Try clearing filters or write a new story!
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 px-4 py-2 bg-wine text-white text-xs font-semibold rounded-lg hover:bg-wine-dark transition"
          >
            Create First Article
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
            >
              {/* Image Header */}
              <div className="relative h-48 bg-neutral-100 overflow-hidden">
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="bg-wine/90 backdrop-blur-xs text-white text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full tracking-wider shadow-xs">
                    {post.category}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => handleTogglePublish(post)}
                    title={post.published ? "Click to set as Draft" : "Click to Publish"}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1 transition ${
                      post.published
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-amber-500 text-white hover:bg-amber-600"
                    }`}
                  >
                    {post.published ? (
                      <>
                        <Eye className="w-3 h-3" /> Live
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" /> Draft
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-serif font-bold text-lg text-ink line-clamp-2 leading-snug group-hover:text-wine transition">
                    {post.title}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                {/* Footer Details & Actions */}
                <div className="pt-3 border-t border-neutral-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1 font-medium text-neutral-600">
                      <User className="w-3.5 h-3.5 text-wine" /> {post.author_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gold" /> {post.read_time || "4 min read"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditModal(post)}
                      className="flex-1 py-1.5 px-3 bg-neutral-100 hover:bg-wine hover:text-white text-ink text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Story</span>
                    </button>

                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-wine/10 text-wine rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-xl text-ink">
                    {editingPost ? "Edit Journal Story" : "Write New Journal Article"}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {editingPost ? "Update article details & published status" : "Publish a story to the public website"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-full transition text-neutral-400 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Secrets of Lucknow: The Art of Dum Pukht Cooking"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                />
              </div>

              {/* Category & Read Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Read Time</label>
                  <input
                    type="text"
                    placeholder="e.g., 5 min read"
                    value={formData.read_time}
                    onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                  />
                </div>
              </div>

              {/* Author & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Author Name</label>
                  <input
                    type="text"
                    placeholder="Chef Rajesh Verma"
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Author Role / Designation</label>
                  <input
                    type="text"
                    placeholder="Master Khansama"
                    value={formData.author_role}
                    onChange={(e) => setFormData({ ...formData, author_role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                  />
                </div>
              </div>

              {/* Cover Image URL & Upload */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Cover Image *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="/img/blog/1.jpg or https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                  />
                  <label className="px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-semibold rounded-xl cursor-pointer transition flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? "Uploading..." : "Upload File"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Short Excerpt / Summary *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Brief 2-line teaser of the article displayed on post cards..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition resize-none"
                />
              </div>

              {/* Full Content */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Full Article Content *</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write the full story here... Paragraphs, secrets, recipes and lore."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition font-sans leading-relaxed"
                />
              </div>

              {/* Published Toggle Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="published_check"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="w-4 h-4 text-wine rounded border-neutral-300 focus:ring-wine"
                />
                <label htmlFor="published_check" className="text-xs font-bold text-ink cursor-pointer select-none">
                  Publish article immediately on public site (/blog)
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-600 font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-wine hover:bg-wine-dark text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingPost
                    ? "Update Story"
                    : "Publish Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
