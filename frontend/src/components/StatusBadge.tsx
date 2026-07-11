import { OrderStatus, PaymentStatus } from "@/types";

const base = "label-caps inline-block shrink-0 rounded-full border px-2 py-0.5";

// All colors are Tailwind defaults (not overridden by the theme), so they read
// correctly in light and dark mode regardless of the active palette.
const ORDER_STYLES: Record<OrderStatus, string> = {
  pending: "border-amber-400/50 bg-amber-400/15 text-amber-700 dark:text-amber-300",
  processing: "border-sky-400/50 bg-sky-400/15 text-sky-700 dark:text-sky-300",
  shipped:
    "border-violet-400/50 bg-violet-400/15 text-violet-700 dark:text-violet-300",
  delivered:
    "border-green-500/50 bg-green-500/15 text-green-700 dark:text-green-300",
  cancelled: "border-red-400/50 bg-red-400/15 text-red-700 dark:text-red-300",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: "border-amber-400/50 bg-amber-400/15 text-amber-700 dark:text-amber-300",
  paid: "border-green-500/50 bg-green-500/15 text-green-700 dark:text-green-300",
  failed: "border-red-400/50 bg-red-400/15 text-red-700 dark:text-red-300",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`${base} ${ORDER_STYLES[status]}`}>{cap(status)}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`${base} ${PAYMENT_STYLES[status]}`}>{cap(status)}</span>
  );
}
