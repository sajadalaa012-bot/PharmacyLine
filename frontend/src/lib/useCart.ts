"use client";

import { useState, useCallback } from "react";
import { Product, CartItem, Order, OrderCreate, OrderStatus } from "@/types";
import { createOrder, updateOrder } from "./api";

/** Shared cart state + checkout used by the storefront and the admin sale screen.
 *  `submitStatus` controls what a new order is saved as: customers create
 *  "pending" orders; the admin creates/approves "approved" ones. */
export function useCart(
  onOrderComplete: () => void,
  submitStatus: OrderStatus = "pending"
) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const add = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find(
        (ci) => ci.product_id === product.id && !ci.is_free
      );
      if (existing) {
        return prev.map((ci) =>
          ci === existing
            ? {
                ...ci,
                quantity: ci.quantity + 1,
                subtotal: (ci.quantity + 1) * ci.unit_price,
              }
            : ci
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
          : ci
      );
    });
  }, []);

  const addFree = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find(
        (ci) => ci.product_id === product.id && ci.is_free
      );
      if (existing) {
        return prev.map((ci) =>
          ci === existing ? { ...ci, quantity: ci.quantity + 1, subtotal: 0 } : ci
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
          (ci) => !(ci.product_id === productId && ci.is_free === isFree)
        );
      }
      return prev.map((ci) =>
        ci.product_id === productId && ci.is_free === isFree
          ? { ...ci, quantity: qty, subtotal: isFree ? 0 : qty * ci.unit_price }
          : ci
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
            : ci
        )
      );
    },
    []
  );

  const clear = useCallback(() => {
    setItems([]);
    setNotes("");
    setDiscount(0);
  }, []);

  /** Preload an existing order into the cart for admin review/editing. */
  const loadOrder = useCallback((existing: Order) => {
    setItems(
      existing.items.map((it) => ({
        product_id: it.product_id,
        product_code: it.product_code,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        subtotal: it.subtotal,
        is_free: it.is_free,
      }))
    );
    setNotes(existing.notes);
    const subtotal = existing.items.reduce((sum, it) => sum + it.subtotal, 0);
    setDiscount(subtotal > 0 ? Math.round((existing.discount / subtotal) * 100) : 0);
    setEditingOrderId(existing.id);
    setOrder(null);
    setSubmitError(null);
  }, []);

  const submit = useCallback(async () => {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const itemsTotal = items.reduce((sum, ci) => sum + ci.subtotal, 0);
    const discountAmount = (itemsTotal * discount) / 100;
    const payload: OrderCreate = {
      notes,
      discount: discountAmount,
      grand_total: Math.max(0, itemsTotal - discountAmount),
      status: submitStatus,
      items: items.map((ci) => ({ ...ci })),
    };

    try {
      const saved = editingOrderId
        ? await updateOrder(editingOrderId, payload)
        : await createOrder(payload);
      setOrder(saved);
      setEditingOrderId(null);
      onOrderComplete();
    } catch (err) {
      setSubmitError(
        `Failed to save order: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [items, notes, discount, submitting, submitStatus, editingOrderId, onOrderComplete]);

  const reset = useCallback(() => {
    setOrder(null);
    setItems([]);
    setNotes("");
    setDiscount(0);
    setEditingOrderId(null);
    setSubmitError(null);
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
    loadOrder,
    editingOrderId,
    submit,
    reset,
    totalQty,
  };
}
