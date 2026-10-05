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
  QrCode,
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
      // 2x Retina Scale canvas for crisp text
      const scale = 2;
      const width = 800;
      const height = 520;

      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Background Base Card
      ctx.fillStyle = "#faf6ef";
      ctx.fillRect(0, 0, width, height);

      // Outer Gold Double Border Frame
      ctx.strokeStyle = "#c8a24d";
      ctx.lineWidth = 3;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      ctx.strokeStyle = "#e0c079";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, 18, width - 36, height - 36);

      // Top Luxury Wine Header Bar
      const headerGradient = ctx.createLinearGradient(0, 0, width, 0);
      headerGradient.addColorStop(0, "#5c1f26");
      headerGradient.addColorStop(0.5, "#7a2e35");
      headerGradient.addColorStop(1, "#5c1f26");
      ctx.fillStyle = headerGradient;
      ctx.fillRect(20, 20, width - 40, 90);

      // Header Brand Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px Georgia, serif";
      ctx.fillText("Lumière Fine Dining", 40, 60);

      ctx.fillStyle = "#e0c079";
      ctx.font = "12px sans-serif";
      ctx.fillText("12 MG Road, Indiranagar, Bengaluru · +91 93465 43338", 40, 84);

      // Booking ID Pill on Right
      ctx.fillStyle = "rgba(200, 162, 77, 0.25)";
      ctx.strokeStyle = "#c8a24d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(width - 240, 42, 200, 42, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText("VIP PASS CONFIRMATION", width - 225, 58);
      ctx.fillStyle = "#e0c079";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`#${reservation.id}`, width - 225, 76);

      // Deposit Verification Banner
      ctx.fillStyle = "#ecfdf5";
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(40, 130, width - 80, 55, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#047857";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`✓ DEPOSIT GUARANTEED: ₹${reservation.depositPaid} CREDITED TO DINING CHECK`, 60, 163);

      ctx.fillStyle = "#4b5563";
      ctx.font = "11px monospace";
      ctx.fillText(`Razorpay Ref: ${reservation.razorpayPaymentId}`, width - 280, 163);

      // 4-Box Matrix (Date, Time, Guests, Seating)
      const boxes = [
        { label: "DATE", val: reservation.date, x: 40 },
        { label: "TIME", val: reservation.time, x: 220 },
        { label: "GUESTS", val: `${reservation.guests} Guests`, x: 400 },
        { label: "SEATING", val: reservation.tableCategory, x: 580 },
      ];

      boxes.forEach((box) => {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#e3dccf";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(box.x, 200, 165, 65, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#c8a24d";
        ctx.font = "bold 10px monospace";
        ctx.fillText(box.label, box.x + 14, 222);

        ctx.fillStyle = "#16130f";
        ctx.font = "bold 12px sans-serif";
        // Simple wrap for long text
        const displayVal = box.val.length > 20 ? box.val.substring(0, 18) + "..." : box.val;
        ctx.fillText(displayVal, box.x + 14, 245);
      });

      // Guest Details & Special Requests Panel
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#e3dccf";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(40, 280, 520, 130, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#7a2e35";
      ctx.font = "bold 13px Georgia, serif";
      ctx.fillText("GUEST & RESERVATION DETAILS", 56, 306);

      ctx.fillStyle = "#374151";
      ctx.font = "12px sans-serif";
      ctx.fillText(`Guest Name: ${reservation.guestName}`, 56, 332);
      ctx.fillText(`Phone: ${reservation.phone}`, 56, 354);
      ctx.fillText(`Email: ${reservation.email}`, 56, 376);

      ctx.fillStyle = "#6b7280";
      ctx.font = "italic 11px sans-serif";
      const reqText = reservation.specialRequest ? `Note: "${reservation.specialRequest}"` : "Note: Standard VIP Table Arrangement";
      ctx.fillText(reqText.length > 70 ? reqText.substring(0, 67) + "..." : reqText, 56, 396);

      // Simulated QR Code Scanner Box on Right
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#c8a24d";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(580, 280, 180, 130, 10);
      ctx.fill();
      ctx.stroke();

      // QR Code grid simulation
      ctx.fillStyle = "#16130f";
      ctx.fillRect(610, 295, 120, 80);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(620, 305, 30, 30);
      ctx.fillRect(680, 305, 30, 30);
      ctx.fillRect(620, 335, 30, 30);
      ctx.fillStyle = "#16130f";
      ctx.fillRect(628, 313, 14, 14);
      ctx.fillRect(688, 313, 14, 14);
      ctx.fillRect(628, 343, 14, 14);
      ctx.fillRect(660, 345, 20, 20);

      ctx.fillStyle = "#c8a24d";
      ctx.font = "bold 9px monospace";
      ctx.fillText("SCAN AT HOST DESK", 615, 395);

      // Bottom Dark Footer Bar
      ctx.fillStyle = "#16130f";
      ctx.fillRect(20, 430, width - 40, 70);

      ctx.fillStyle = "#e0c079";
      ctx.font = "11px sans-serif";
      ctx.fillText(
        "Please present this digital voucher upon arrival at Lumière Indiranagar.",
        40,
        458
      );
      ctx.fillStyle = "#9ca3af";
      ctx.font = "10px monospace";
      ctx.fillText(
        "Deposit non-refundable for cancellations under 4 hrs · Valid for reservation date only.",
        40,
        478
      );

      // Trigger crisp PNG File Download
      const link = document.createElement("a");
      link.download = `Lumiere_Reservation_Voucher_${reservation.id}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
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
            className="print-voucher bg-white border-2 border-gold/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 print:space-y-4 print:p-6 print:m-0 relative overflow-hidden"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-cream/30 p-6 rounded-2xl border border-cream2 text-xs">
              <div className="space-y-2 sm:col-span-2">
                <div className="font-bold text-ink text-sm">Guest & Booking Details</div>
                <div className="text-neutral-700"><strong>Name:</strong> {reservation.guestName}</div>
                <div className="text-neutral-700"><strong>Phone:</strong> {reservation.phone}</div>
                <div className="text-neutral-700"><strong>Email:</strong> {reservation.email}</div>
                <div className="flex items-start gap-2 text-neutral-700 pt-1">
                  <MapPin size={14} className="text-gold shrink-0 mt-0.5" />
                  <span>12 MG Road, Indiranagar, Bengaluru, KA 560038 (+91 93465 43338)</span>
                </div>
                {reservation.specialRequest && (
                  <div className="text-neutral-600 pt-1 italic">
                    &ldquo;{reservation.specialRequest}&rdquo;
                  </div>
                )}
                <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg font-mono border border-emerald-200 mt-2">
                  100% of ₹500 deposit will be deducted from your final dining check.
                </div>
              </div>

              {/* QR CODE SCANNER PANEL */}
              <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-cream2 pt-4 sm:pt-0 sm:pl-6 text-center space-y-2">
                <div className="p-3 bg-white border border-gold/40 rounded-xl shadow-sm">
                  <QrCode size={72} className="text-ink" />
                </div>
                <div className="text-[10px] font-mono text-neutral-500 font-bold tracking-wider uppercase">
                  Scan at Desk
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
