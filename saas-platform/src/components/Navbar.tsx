"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Menu, X, ShieldCheck, ExternalLink } from "lucide-react";

interface Props {
  onOpenTrial: (plan?: string) => void;
}

export default function Navbar({ onOpenTrial }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-navy-950/90 backdrop-blur-md border-b border-gold/20 py-3 shadow-2xl"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold via-wine to-navy-950 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center font-serif text-gold font-bold text-xl">
              L
            </div>
          </div>
          <div>
            <div className="font-serif font-bold text-lg text-white leading-tight flex items-center gap-2">
              Lumière<span className="text-gold">OS</span>
              <span className="bg-wine/30 text-gold text-[9px] font-mono px-2 py-0.5 rounded border border-wine/40 uppercase">
                B2B SaaS
              </span>
            </div>
            <div className="text-[10px] text-slate-400 tracking-wider uppercase">
              Restaurant Operating System
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link href="#features" className="hover:text-gold transition">
            Features
          </Link>
          <Link href="#solutions" className="hover:text-gold transition">
            Solutions
          </Link>
          <Link href="#pricing" className="hover:text-gold transition">
            Pricing Plans
          </Link>
          <Link href="#calculator" className="hover:text-gold transition">
            ROI Calculator
          </Link>
          <Link href="#faq" className="hover:text-gold transition">
            FAQ
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-4">
          <a
            href="http://localhost:3000/admin"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition flex items-center gap-1.5"
          >
            <span>Live Admin Demo</span>
            <ExternalLink className="w-3.5 h-3.5 text-gold" />
          </a>

          <button
            onClick={() => onOpenTrial("Growth Fine Dining")}
            className="btn-gold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-950/95 border-b border-slate-800 px-4 py-6 space-y-4 animate-in fade-in">
          <nav className="flex flex-col gap-3 text-sm text-slate-300">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </Link>
            <Link href="#solutions" onClick={() => setMobileMenuOpen(false)}>
              Solutions
            </Link>
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing Plans
            </Link>
            <Link href="#calculator" onClick={() => setMobileMenuOpen(false)}>
              ROI Calculator
            </Link>
            <Link href="#faq" onClick={() => setMobileMenuOpen(false)}>
              FAQ
            </Link>
          </nav>
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            <a
              href="http://localhost:3000/admin"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 text-center text-xs font-semibold text-slate-300 bg-slate-800 rounded-xl"
            >
              Live Admin Workspace Demo
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTrial("Growth Fine Dining");
              }}
              className="btn-gold w-full py-3 rounded-xl text-xs font-bold text-center"
            >
              Start 14-Day Free Trial
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
