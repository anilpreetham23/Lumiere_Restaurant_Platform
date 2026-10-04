"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, Loader2, CheckCircle2, ShoppingBag, CreditCard, Banknote, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { money } from "@/data/menu";
import { placeOrder } from "@/actions/public";
import { startPublicOrderRazorpayPayment } from "@/actions/pay";

async function ensureScript() {
  if (typeof window !== "undefined" && (window as any).Razorpay) return true;
  return new Promise<boolean>((res) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.body.appendChild(s);
  });
}

export default function OrderPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [paidOnline, setPaidOnline] = useState(false);
  const [form, setForm] = useState({ customer_name: "", email: "", phone: "", notes: "" });

  const SERVICE = total * 0.125;
  const grand = total + SERVICE;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError(null);

    // 1. Place order in database first
    const res = await placeOrder({
      ...form,
      items: items.map((i) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty })),
    });

    if (!res.ok || !res.orderId) {
      setError(res.error ?? "Failed to place order.");
      setState("idle");
      return;
    }

    const createdId = res.orderId;
    setOrderId(createdId);

    // 2. Handle Payment Method
    if (paymentMethod === "online") {
      const okScript = await ensureScript();
      if (!okScript) {
        setError("Failed to load Razorpay SDK. Please check internet connection.");
        setState("idle");
        return;
      }

      const pay = await startPublicOrderRazorpayPayment(createdId, grand);
      if (!pay.ok || pay.gateway !== "razorpay") {
        setError((pay as any).error || "Failed to initialize Razorpay payment.");
        setState("idle");
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: pay.keyId,
        amount: pay.amount,
        currency: "INR",
        name: "Lumière Fine Dining",
        description: `Order #${createdId.slice(0, 8)}`,
        order_id: pay.orderId,
        theme: { color: "#7a2e35" },
        prefill: {
          name: form.customer_name,
          email: form.email,
          contact: form.phone,
        },
        handler: async (response: any) => {
          setPaidOnline(true);
          setState("done");
          clear();
        },
        modal: {
          ondismiss: () => {
            // If user closes Razorpay modal, order is recorded as Cash/Pending
            setPaidOnline(false);
            setState("done");
            clear();
          },
        },
      });
      rzp.open();
      return;
    }

    // COD / Pay on Pickup
    setPaidOnline(false);
    setState("done");
    clear();
  }

  if (state === "done") {
    return (
      <section className="py-28 bg-cream min-h-[70vh] grid place-items-center">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md mx-5 shadow-xl border border-neutral-100 space-y-4">
          <CheckCircle2 size={58} className="text-gold mx-auto" />
          <h1 className="font-serif text-3xl font-bold text-ink">Order Confirmed</h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Thank you, <span className="font-bold text-ink">{form.customer_name}</span>. Your order reference is{" "}
            <span className="font-mono text-wine font-bold">{orderId?.slice(0, 8)}</span>.
          </p>

          <div className="pt-2">
            {paidOnline ? (
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs font-semibold px-4 py-2 rounded-full border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Paid Online via Razorpay: {money(grand)}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 text-xs font-semibold px-4 py-2 rounded-full border border-amber-200">
                <Banknote className="w-4 h-4 text-amber-600" />
                <span>Payment Mode: Cash on Delivery / Arrival ({money(grand)})</span>
              </div>
            )}
          </div>

          <p className="text-xs text-neutral-400">
            Our kitchen team has received your order and is preparing your meal.
          </p>

          <Link href="/menu" className="btn-gold mt-4 w-full justify-center">
            Order Something Else
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-ink text-white py-16 text-center">
        <span className="section-label">Order Online</span>
        <h1 className="font-serif text-4xl mt-3 text-white">Your Order</h1>
        <div className="gold-line mx-auto mt-4" />
      </section>

      <section className="py-16 bg-cream">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-5 gap-8">
          {/* Left Cart Items List */}
          <div className="lg:col-span-3">
            {items.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-neutral-500 shadow-xs">
                <ShoppingBag size={44} className="mx-auto mb-3 text-gold/60" />
                <p className="font-serif text-lg">Your order is empty.</p>
                <Link href="/menu" className="btn-outline mt-5">
                  Browse the Menu
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 space-y-4 shadow-xs border border-neutral-100">
                <h3 className="font-serif text-xl font-bold text-ink border-b pb-3">Selected Dishes</h3>
                {items.map((i) => (
                  <div key={i.id} className="flex gap-4 items-center border-b border-cream2 pb-4 last:border-0 last:pb-0">
                    <Image src={i.image} alt={i.title} width={72} height={72} className="w-18 h-18 rounded-xl object-cover shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-ink">{i.title}</p>
                      <p className="text-wine font-serif">{money(i.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(i.id, i.qty - 1)} className="w-7 h-7 grid place-items-center rounded-full bg-cream2 hover:bg-neutral-200 transition">
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{i.qty}</span>
                      <button onClick={() => setQty(i.id, i.qty + 1)} className="w-7 h-7 grid place-items-center rounded-full bg-cream2 hover:bg-neutral-200 transition">
                        <Plus size={13} />
                      </button>
                    </div>
                    <button onClick={() => remove(i.id)} className="text-neutral-400 hover:text-wine ml-2 transition">
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Checkout & Payment Options Form */}
          <div className="lg:col-span-2">
            <form onSubmit={submit} className="bg-white rounded-2xl p-6 space-y-5 shadow-xs border border-neutral-100">
              <h3 className="font-serif text-2xl font-bold text-ink">Checkout</h3>

              {/* Customer Contact Inputs */}
              <div className="space-y-3">
                <input
                  required
                  placeholder="Full name *"
                  className="field text-xs"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
                <input
                  required
                  type="email"
                  placeholder="Email address *"
                  className="field text-xs"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  required
                  placeholder="Phone number *"
                  className="field text-xs"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <textarea
                  placeholder="Special instructions (allergies, spice level...)"
                  rows={2}
                  className="field text-xs resize-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {/* Payment Method Selector Card */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("online")}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                      paymentMethod === "online"
                        ? "border-wine bg-wine/5 shadow-xs"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CreditCard className={`w-5 h-5 ${paymentMethod === "online" ? "text-wine" : "text-neutral-400"}`} />
                      <div className={`w-3.5 h-3.5 rounded-full border-2 ${paymentMethod === "online" ? "border-wine bg-wine" : "border-neutral-300"}`} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-ink">Pay Online</div>
                      <div className="text-[10px] text-neutral-500">UPI, Card, Netbanking</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                      paymentMethod === "cod"
                        ? "border-wine bg-wine/5 shadow-xs"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Banknote className={`w-5 h-5 ${paymentMethod === "cod" ? "text-wine" : "text-neutral-400"}`} />
                      <div className={`w-3.5 h-3.5 rounded-full border-2 ${paymentMethod === "cod" ? "border-wine bg-wine" : "border-neutral-300"}`} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-ink">Cash / Pickup</div>
                      <div className="text-[10px] text-neutral-500">Pay on delivery or arrival</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Order Calculation Breakdown */}
              <div className="border-t border-cream2 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-neutral-500 text-xs">
                  <span>Subtotal</span>
                  <span>{money(total)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-xs">
                  <span>Service Charge (12.5%)</span>
                  <span>{money(SERVICE)}</span>
                </div>
                <div className="flex justify-between font-serif text-xl font-bold text-wine pt-2 border-t border-dashed border-neutral-200">
                  <span>Total Payable</span>
                  <span>{money(grand)}</span>
                </div>
              </div>

              {error && <p className="text-xs text-wine font-medium">{error}</p>}

              <button
                disabled={items.length === 0 || state === "loading"}
                className="btn-wine w-full justify-center disabled:opacity-60 font-semibold py-3"
              >
                {state === "loading" ? <Loader2 className="animate-spin" size={18} /> : null}
                {paymentMethod === "online" ? `Pay ${money(grand)} & Place Order` : "Confirm Cash Order"}
              </button>

              <p className="text-[0.7rem] text-neutral-400 text-center leading-relaxed">
                {paymentMethod === "online"
                  ? "Secure online payment powered by Razorpay. 100% encrypted."
                  : "Pay in cash or card upon food delivery or pickup."}
              </p>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
