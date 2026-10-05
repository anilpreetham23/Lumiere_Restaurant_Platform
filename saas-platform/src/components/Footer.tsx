import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-slate-800 text-slate-400 py-16 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-wine flex items-center justify-center font-serif text-navy-950 font-bold text-lg">
                L
              </div>
              <span className="font-serif font-bold text-base text-white">Lumière OS</span>
            </Link>
            <p className="text-slate-400 leading-relaxed">
              The next-generation B2B Multi-Tenant Restaurant Operating System. Powering online ordering, table reservations, live KDS, marketplace sync, and inventory.
            </p>
            <div className="flex items-center gap-2 text-gold font-mono text-[10px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SOC2 Type II & PCI-DSS Compliant</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Platform Portals</div>
            <ul className="space-y-2 text-slate-300">
              <li><Link href="/" className="hover:text-gold transition">Home Overview</Link></li>
              <li><Link href="/features" className="hover:text-gold transition">All Features & KDS Specs</Link></li>
              <li><Link href="/solutions" className="hover:text-gold transition">Restaurant Segment Solutions</Link></li>
              <li><Link href="/pricing" className="hover:text-gold transition">Pricing & Subscription Plans</Link></li>
              <li><Link href="/contact" className="hover:text-gold transition">Sales & Contact</Link></li>
            </ul>
          </div>

          {/* SaaS Pricing & Quick Access */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Subscription Plans</div>
            <ul className="space-y-2 text-slate-300">
              <li><Link href="/pricing" className="hover:text-gold transition">Starter Outlet Plan (₹4,999)</Link></li>
              <li><Link href="/pricing" className="hover:text-gold transition">Growth Fine Dining (₹9,999)</Link></li>
              <li><Link href="/pricing" className="hover:text-gold transition">Enterprise Franchise Plan</Link></li>
              <li><a href="http://localhost:3000/admin" target="_blank" rel="noreferrer" className="hover:text-gold transition text-gold flex items-center gap-1">Live Admin Workspace &rarr;</a></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Organization & Support</div>
            <p className="text-slate-400">
              HQ: 12 MG Road, Indiranagar, Bengaluru, KA 560038, India
            </p>
            <p className="text-slate-300 font-mono">
              Phone: +91 93465 43338<br />
              Email: saas-support@lumiere.com
            </p>
            <div className="pt-2">
              <span className="inline-block bg-slate-800 text-gold text-[10px] px-3 py-1 rounded-full border border-slate-700">
                24/7 Priority SLA Active
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-slate-500 gap-4">
          <div>
            © {new Date().getFullYear()} Lumière B2B SaaS Platform Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/contact" className="hover:text-gold">Contact Sales</Link>
            <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="hover:text-gold">Customer Restaurant Site (Port 3000)</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
