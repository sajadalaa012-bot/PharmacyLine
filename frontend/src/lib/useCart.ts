"use client";

import { useState, useCallback, useRef } from "react";
import { Product, CartItem, Order, CreateOrderInput } from "@/types";
import { createOrder } from "./api";
import { saveMyOrder } from "./myOrders";

/** Customer/checkout details collected before placing an order. */
export interface CustomerInfo {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  billing_address?: string | null;
  payment_method: string;
  notes?: string;
  shipping_cost?: number;
  tax?: number;
}

/** Shared cart state + checkout used by the storefront and the admin sale screen. */
export function useCart(onOrderComplete: () => void) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Stable across retries so a resubmit/refresh can't create a duplicate.
  const idemKeyRef = useRef<string | null>(null);

  const add = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find(
        (ci) => ci.product_id === product.id && !ci.is_free,
      );
      if (existing) {
        return prev.map((ci) =>
          ci === existing
            ? {
                ...ci,
                quantity: ci.quantity + 1,
                subtotal: (ci.quantity + 1) * ci.unit_price,
              }
            : ci,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          subtotal: product.price,
          is_free: false,
        },
      ];
    });
  }, []);

  const remove = useCallback((product: Product) => {
    setItems((prev) => {
      const paid = prev.find((ci) => ci.product_id === product.id && !ci.is_free);
      const free = prev.find((ci) => ci.product_id === product.id && ci.is_free);
      const target = paid || free;
      if (!target) return prev;
      if (target.quantity <= 1) return prev.filter((ci) => ci !== target);
      return prev.map((ci) =>
        ci === target
          ? {
              ...ci,
              quantity: ci.quantity - 1,
              subtotal: (ci.quantity - 1) * ci.unit_price,
            }
          : ci,
      );
    });
  }, []);

  const addFree = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find(
        (ci) => ci.product_id === product.id && ci.is_free,
      );
      if (existing) {
        return prev.map((ci) =>
          ci === existing ? { ...ci, quantity: ci.quantity + 1, subtotal: 0 } : ci,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          quantity: 1,
          unit_price: 0,
          subtotal: 0,
          is_free: true,
        },
      ];
    });
  }, []);

  const setQty = useCallback((productId: number, isFree: boolean, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) {
        return prev.filter(
          (ci) => !(ci.product_id === productId && ci.is_free === isFree),
        );
      }
      return prev.map((ci) =>
        ci.product_id === productId && ci.is_free === isFree
          ? { ...ci, quantity: qty, subtotal: isFree ? 0 : qty * ci.unit_price }
          : ci,
      );
    });
  }, []);

  const setUnitPrice = useCallback(
    (productId: number, isFree: boolean, price: number) => {
      setItems((prev) =>
        prev.map((ci) =>
          ci.product_id === productId && ci.is_free === isFree
            ? {
                ...ci,
                unit_price: price,
                subtotal: isFree ? 0 : ci.quantity * price,
              }
            : ci,
        ),
      );
    },
    [],
  );

  const clear = useCallback(() => {
    setItems([]);
    setNotes("");
    setDiscount(0);
  }, []);

  const submit = useCallback(
    async (customer: CustomerInfo) => {
      if (items.length === 0 || submitting) return;
      setSubmitting(true);
      setSubmitError(null);

      if (!idemKeyRef.current) idemKeyRef.current = crypto.randomUUID();

      const itemsTotal = items.reduce((sum, ci) => sum + ci.subtotal, 0);
      const discountAmount = (itemsTotal * discount) / 100;
      const input: CreateOrderInput = {
        idempotency_key: idemKeyRef.current,
        customer_name: customer.customer_name,
        customer_email: customer.customer_email,
        customer_phone: customer.customer_phone,
        shipping_address: customer.shipping_address,
        billing_address: customer.billing_address ?? null,
        payment_method: customer.payment_method,
        notes: customer.notes ?? notes,
        shipping_cost: customer.shipping_cost ?? 0,
        tax: customer.tax ?? 0,
        discount: discountAmount,
        items: items.map((ci) => ({
          product_id: ci.product_id,
          product_code: ci.product_code,
          product_name: ci.product_name,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          subtotal: ci.subtotal,
          is_free: ci.is_free,
        })),
      };

      try {
        const saved = await createOrder(input);
        saveMyOrder(saved);
        setOrder(saved);
        idemKeyRef.current = null; // next order gets a fresh key
        onOrderComplete();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : String(err));
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    },
    [items, notes, discount, submitting, onOrderComplete],
  );

  const reset = useCallback(() => {
    setOrder(null);
    setItems([]);
    setNotes("");
    setDiscount(0);
    setSubmitError(null);
    idemKeyRef.current = null;
  }, []);

  const totalQty = items.reduce((sum, ci) => sum + ci.quantity, 0);

  return {
    items,
    notes,
    setNotes,
    discount,
    setDiscount,
    order,
    submitting,
    submitError,
    add,
    remove,
    addFree,
    setQty,
    setUnitPrice,
    clear,
    submit,
    reset,
    totalQty,
  };
}
