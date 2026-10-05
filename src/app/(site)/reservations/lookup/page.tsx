"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Clock,
  Users,
  Utensils,
  ShieldCheck,
  MapPin,
  Printer,
  Download,
  Sparkles,
  Phone,
  CheckCircle2,
} from "lucide-react";

export default function ReservationLookupPage() {
  const [searchPhone, setSearchPhone] = useState("");
  const [reservation, setReservation] = useState<any>({
    id: "RES-99381",
    guestName: "Rajesh Sharma",
    phone: "+91 93465 43338",
    email: "rajesh.sharma@example.com",
    date: "Tomorrow, Oct 6, 2026",
    time: "8:30 PM IST",
    guests: 4,
    tableCategory: "Royal Booth (VIP Seating)",
    depositPaid: 500,
    razorpayPaymentId: "pay_98231019283",
    status: "Confirmed",
    specialRequest: "Anniversary celebration & Quiet table near garden window",
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    setReservation({
      ...reservation,
      phone: searchPhone,
      id: `RES-${Math.floor(10000 + Math.random() * 90000)}`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background Card
      ctx.fillStyle = "#faf6ef";
      ctx.fillRect(0, 0, 800, 480);

      // Gold Outer Border
      ctx.strokeStyle = "#c8a24d";
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, 768, 448);

      // Top Banner Fill
      ctx.fillStyle = "#7a2e35";
      ctx.fillRect(16, 16, 768, 80);

      // Header Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px Georgia, serif";
      ctx.fillText("Lumière Fine Dining", 40, 60);

      ctx.fillStyle = "#e0c079";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(`RESERVATION CONFIRMATION #${reservation.id}`, 500, 60);

      // Deposit Badge Box
      ctx.fillStyle = "#ecfdf5";
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 1.5;
      ctx.fillRect(40, 120, 720, 60);
      ctx.strokeRect(40, 120, 720, 60);

      ctx.fillStyle = "#047857";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`✓ DEPOSIT PROTECTED: ₹${reservation.depositPaid} CREDITED`, 60, 155);

      ctx.fillStyle = "#374151";
      ctx.font = "12px monospace";
      ctx.fillText(`Razorpay Ref: ${reservation.razorpayPaymentId}`, 480, 155);

      // Details Grid
      ctx.fillStyle = "#16130f";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Guest Name: ${reservation.guestName}`, 60, 220);
      ctx.fillText(`Phone: ${reservation.phone}`, 60, 250);
      ctx.fillText(`Date: ${reservation.date}`, 60, 280);
      ctx.fillText(`Time: ${reservation.time}`, 60, 310);

      ctx.fillText(`Party Size: ${reservation.guests} Guests`, 440, 220);
      ctx.fillText(`Seating: ${reservation.tableCategory}`, 440, 250);
      ctx.fillText(`Venue: 12 MG Road, Indiranagar, Bengaluru`, 440, 280);
      ctx.fillText(`Status: CONFIRMED VIP PASS`, 440, 310);

      // Footer Bar
      ctx.fillStyle = "#16130f";
      ctx.fillRect(16, 400, 768, 64);
      ctx.fillStyle = "#e0c079";
      ctx.font = "12px sans-serif";
      ctx.fillText("Present this digital voucher on arrival. 100% of deposit credited to final dining check.", 40, 438);

      // Trigger File Download
      const link = document.createElement("a");
      link.download = `Lumiere_Pass_${reservation.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Voucher download error", err);
    }
  };

  return (
    <div className="bg-cream min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="text-center space-y-3 print:hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/20 text-wine text-xs font-mono font-semibold uppercase">
            <Sparkles size={14} />
            <span>Digital Reservation Pass</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
            Reservation & Deposit Lookup
          </h1>
          <p className="text-neutral-600 text-sm max-w-lg mx-auto font-light">
            Enter your phone number or Booking ID to retrieve your reservation voucher and deposit receipt.
          </p>
        </div>

        {/* SEARCH BAR */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto print:hidden">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Enter phone number or RES-99381"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full bg-white border border-cream3 rounded-xl pl-10 pr-4 py-3 text-sm text-ink focus:outline-none focus:border-gold shadow-sm"
            />
          </div>
          <button type="submit" className="btn-gold px-6 py-3 text-xs font-bold rounded-xl shadow-md cursor-pointer">
            Find Pass
          </button>
        </form>

        {/* LUXURY RESERVATION VOUCHER CARD */}
        {reservation && (
          <div
            id="reservation-pass-voucher"
            className="print-voucher bg-white border-2 border-gold/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden"
          >
            {/* VOUCHER HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-cream2 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-2xl text-ink">Lumière Fine Dining</span>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase">
                    {reservation.status}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 mt-1 font-mono">
                  BOOKING CONFIRMATION #{reservation.id}
                </div>
              </div>

              {/* RAZORPAY DEPOSIT BADGE */}
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-gold/60 p-3.5 rounded-2xl text-right">
                <div className="text-[10px] text-amber-800 font-mono font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Deposit Protected</span>
                </div>
                <div className="text-base font-bold text-wine font-serif mt-0.5">
                  ₹{reservation.depositPaid} Credit Applied
                </div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Razorpay ID: {reservation.razorpayPaymentId}
                </div>
              </div>
            </div>

            {/* RESERVATION DETAILS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2">
              <div className="bg-cream/60 p-4 rounded-2xl border border-cream2">
                <div className="flex items-center gap-2 text-gold mb-1">
                  <Calendar size={18} />
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">Date</span>
                </div>
                <div className="text-sm font-bold text-ink">{reservation.date}</div>
              </div>

              <div className="bg-cream/60 p-4 rounded-2xl border border-cream2">
                <div className="flex items-center gap-2 text-gold mb-1">
                  <Clock size={18} />
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">Time</span>
                </div>
                <div className="text-sm font-bold text-ink">{reservation.time}</div>
              </div>

              <div className="bg-cream/60 p-4 rounded-2xl border border-cream2">
                <div className="flex items-center gap-2 text-gold mb-1">
                  <Users size={18} />
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">Party Size</span>
                </div>
                <div className="text-sm font-bold text-ink">{reservation.guests} Guests</div>
              </div>

              <div className="bg-cream/60 p-4 rounded-2xl border border-cream2">
                <div className="flex items-center gap-2 text-gold mb-1">
                  <Utensils size={18} />
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">Seating Area</span>
                </div>
                <div className="text-sm font-bold text-ink">{reservation.tableCategory}</div>
              </div>
            </div>

            {/* GUEST & VENUE INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-cream/30 p-6 rounded-2xl border border-cream2 text-xs">
              <div className="space-y-2">
                <div className="font-bold text-ink text-sm">Guest Information</div>
                <div className="text-neutral-700"><strong>Name:</strong> {reservation.guestName}</div>
                <div className="text-neutral-700"><strong>Phone:</strong> {reservation.phone}</div>
                <div className="text-neutral-700"><strong>Email:</strong> {reservation.email}</div>
                {reservation.specialRequest && (
                  <div className="text-neutral-600 pt-1 italic">
                    &ldquo;{reservation.specialRequest}&rdquo;
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="font-bold text-ink text-sm">Dining Location</div>
                <div className="flex items-start gap-2 text-neutral-700">
                  <MapPin size={16} className="text-gold shrink-0 mt-0.5" />
                  <span>12 MG Road, Indiranagar, Bengaluru, KA 560038</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700">
                  <Phone size={16} className="text-gold shrink-0" />
                  <span>+91 93465 43338</span>
                </div>
                <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg font-mono border border-emerald-200 mt-2">
                  100% of ₹500 deposit will be deducted from your final dining bill.
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-cream2 text-xs print:hidden">
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPNG}
                  className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Download size={15} /> Download Voucher (.png)
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 flex items-center gap-2 font-semibold cursor-pointer"
                >
                  <Printer size={15} /> Print Pass
                </button>
              </div>

              <div className="flex gap-3">
                <Link href="/reservations" className="text-wine font-bold flex items-center gap-1 hover:underline">
                  New Reservation
                </Link>
                <Link href="/menu" className="btn-gold px-5 py-2.5 text-xs rounded-xl">
                  Browse Menu & Pre-Order
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
