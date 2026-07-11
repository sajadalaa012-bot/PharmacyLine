"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CustomerInfo } from "@/lib/useCart";
import { PAYMENT_METHODS, PaymentMethod } from "@/types";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash_on_delivery: "Cash on delivery",
  card: "Card",
  bank_transfer: "Bank transfer",
};

interface CheckoutFormProps {
  total: number;
  submitting: boolean;
  error?: string | null;
  onBack: () => void;
  onPlace: (info: CustomerInfo) => void;
}

/** Collects the customer details required to place an order. */
export default function CheckoutForm({
  total,
  submitting,
  error,
  onBack,
  onPlace,
}: CheckoutFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid =
    name.trim() && emailValid && phone.trim() && address.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || submitting) return;
    onPlace({
      customer_name: name.trim(),
      customer_email: email.trim(),
      customer_phone: phone.trim(),
      shipping_address: address.trim(),
      payment_method: method,
      notes: notes.trim(),
    });
  };

  const field =
    "w-full rounded-md border border-line bg-sunken px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25";
  const invalid = "border-rose/60 focus:border-rose/60 focus:ring-rose/20";

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to cart"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
          Checkout
        </h2>
      </div>

      <div className="scroll-thin flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
        <div>
          <label className="label-caps mb-1.5 block text-ink-3">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${field} ${touched && !name.trim() ? invalid : ""}`}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label-caps mb-1.5 block text-ink-3">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${field} ${touched && !emailValid ? invalid : ""}`}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label-caps mb-1.5 block text-ink-3">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`${field} ${touched && !phone.trim() ? invalid : ""}`}
            placeholder="07xx xxx xxxx"
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
        <div>
          <label className="label-caps mb-1.5 block text-ink-3">
            Shipping address
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className={`${field} resize-none ${touched && !address.trim() ? invalid : ""}`}
            placeholder="Street, city, area…"
            autoComplete="street-address"
          />
        </div>
        <div>
          <label className="label-caps mb-1.5 block text-ink-3">
            Payment method
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition ${
                  method === m
                    ? "border-brand bg-brand/10 text-ink"
                    : "border-line text-ink-2 hover:bg-sunken"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={m}
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  className="accent-brand"
                />
                {METHOD_LABEL[m]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label-caps mb-1.5 block text-ink-3">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${field} resize-none`}
            placeholder="Delivery instructions…"
          />
        </div>

        {error && (
          <div className="rounded-md border border-rose/30 bg-rose/10 p-2.5 text-xs text-rose">
            {error}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line px-5 py-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="label-caps text-ink-2">Total</span>
          <span className="font-display text-[22px] font-semibold tracking-tight text-ink tabular-nums">
            {total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            <span className="ml-1.5 font-sans text-xs font-semibold tracking-[0.08em] text-ink-3">
              IQD
            </span>
          </span>
        </div>
        <button
          type="submit"
          disabled={submitting || (touched && !valid)}
          className="h-11 w-full rounded-md bg-brand text-sm font-semibold tracking-[0.01em] text-on-brand
                     shadow-[0_10px_24px_-10px_var(--color-brand)] transition-all
                     hover:bg-brand-deep active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? "Placing order…" : "Place Order"}
        </button>
      </div>
    </form>
  );
}
