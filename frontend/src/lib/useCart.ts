"use client";

import { useState, useCallback, useRef } from "react";
import {
  Product,
  ProductVariant,
  CartItem,
  CustomerDetails,
  EMPTY_CUSTOMER,
  Order,
  OrderCreate,
  OrderStatus,
  isStockTracked,
  lineKey,
  variantPricing,
  variantStock,
  variantCode,
} from "@/types";
import { createOrder, updateOrder } from "./api";
import { useI18n } from "./LanguageProvider";
import { localized } from "./i18n";

/** Shared cart state + checkout used by the storefront and the admin sale screen.
 *  `submitStatus` controls what a new order is saved as: customers create
 *  "pending" orders; the admin creates/approves "approved" ones. */
export function useCart(
  onOrderComplete: () => void,
  submitStatus: OrderStatus = "pending"
) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [customer, setCustomer] = useState<CustomerDetails>(EMPTY_CUSTOMER);
  const [discount, setDiscount] = useState<number>(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const { t, lang } = useI18n();

  // Order lines keep the product name as the buyer saw it when they added it.
  // The order is a record of a transaction, so it should not re-translate
  // itself later when someone opens it in the other language.
  const lineName = useCallback(
    (product: Product) => localized(product, "name", lang),
    [lang],
  );

  /** The option label, snapshotted the same way and for the same reason. */
  const optionName = useCallback(
    (variant?: ProductVariant | null) =>
      variant ? localized(variant, "name", lang) : undefined,
    [lang],
  );

  // Stock ceilings for whatever is in the basket, remembered as items are
  // added. Kept here rather than on the cart line because cart lines are sent
  // to the server verbatim as order items. Keyed per line, so two options of
  // one product each hold their own ceiling.
  const limits = useRef(new Map<string, number>());

  /** Largest quantity allowed on one line, or Infinity when untracked. */
  const limitFor = useCallback(
    (key: string) => limits.current.get(key) ?? Infinity,
    [],
  );

  /** The cart line for one product/option, paid or bonus. */
  const findLine = useCallback(
    (list: CartItem[], key: string) => list.find((ci) => lineKey(ci) === key),
    [],
  );

  /** How many of one option are in the basket — both lines unless isFree is set. */
  const qtyOf = useCallback(
    (productId: number, variantId?: string, isFree?: boolean) =>
      items
        .filter(
          (ci) =>
            ci.product_id === productId &&
            (ci.variant_id ?? undefined) === variantId &&
            (isFree === undefined || ci.is_free === isFree),
        )
        .reduce((sum, ci) => sum + ci.quantity, 0),
    [items],
  );

  const add = useCallback(
    (product: Product, variant?: ProductVariant | null) => {
      const key = lineKey({
        product_id: product.id,
        variant_id: variant?.id,
        is_free: false,
      });
      const stock = variantStock(product, variant);
      if (isStockTracked({ stock })) limits.current.set(key, stock ?? 0);
      const max = isStockTracked({ stock }) ? (stock ?? 0) : Infinity;
      if (max <= 0) return;
      const { price } = variantPricing(product, variant);
      setItems((prev) => {
        const existing = findLine(prev, key);
        if (existing) {
          // Silently hold at the ceiling rather than letting the order promise
          // stock that isn't there.
          if (existing.quantity >= max) return prev;
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
            product_code: variantCode(product, variant),
            product_name: lineName(product),
            variant_id: variant?.id,
            variant_name: optionName(variant),
            quantity: 1,
            unit_price: price,
            subtotal: price,
            is_free: false,
          },
        ];
      });
    },
    [lineName, optionName, findLine]
  );

  const remove = useCallback(
    (product: Product, variant?: ProductVariant | null) => {
      setItems((prev) => {
        const of = (isFree: boolean) =>
          findLine(
            prev,
            lineKey({
              product_id: product.id,
              variant_id: variant?.id,
              is_free: isFree,
            }),
          );
        // The paid line comes down first; a bonus is only taken back once
        // there is nothing paid-for left to remove.
        const target = of(false) || of(true);
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
    },
    [findLine]
  );

  const addFree = useCallback(
    (product: Product, variant?: ProductVariant | null) => {
      const key = lineKey({
        product_id: product.id,
        variant_id: variant?.id,
        is_free: true,
      });
      const stock = variantStock(product, variant);
      if (isStockTracked({ stock })) limits.current.set(key, stock ?? 0);
      const max = isStockTracked({ stock }) ? (stock ?? 0) : Infinity;
      if (max <= 0) return;
      setItems((prev) => {
        const existing = findLine(prev, key);
        if (existing) {
          if (existing.quantity >= max) return prev;
          return prev.map((ci) =>
            ci === existing ? { ...ci, quantity: ci.quantity + 1, subtotal: 0 } : ci
          );
        }
        return [
          ...prev,
          {
            product_id: product.id,
            product_code: variantCode(product, variant),
            product_name: lineName(product),
            variant_id: variant?.id,
            variant_name: optionName(variant),
            quantity: 1,
            unit_price: 0,
            subtotal: 0,
            is_free: true,
          },
        ];
      });
    },
    [lineName, optionName, findLine]
  );

  // Both of these address one line by its key rather than by product, since a
  // product bought in two options is two lines the panel edits independently.
  const setQty = useCallback(
    (key: string, qty: number) => {
      // Typing a quantity by hand goes through here too, so the ceiling has to
      // be enforced at this level and not only on the +/- buttons.
      const capped = Math.min(qty, limitFor(key));
      setItems((prev) => {
        if (capped <= 0) return prev.filter((ci) => lineKey(ci) !== key);
        return prev.map((ci) =>
          lineKey(ci) === key
            ? {
                ...ci,
                quantity: capped,
                subtotal: ci.is_free ? 0 : capped * ci.unit_price,
              }
            : ci
        );
      });
    },
    [limitFor]
  );

  const setUnitPrice = useCallback((key: string, price: number) => {
    setItems((prev) =>
      prev.map((ci) =>
        lineKey(ci) === key
          ? {
              ...ci,
              unit_price: price,
              subtotal: ci.is_free ? 0 : ci.quantity * price,
            }
          : ci
      )
    );
  }, []);

  /** Update one checkout field — name, phone, or delivery location. */
  const setCustomerField = useCallback(
    (field: keyof CustomerDetails, value: string) =>
      setCustomer((prev) => ({ ...prev, [field]: value })),
    [],
  );

  const clear = useCallback(() => {
    setItems([]);
    setNotes("");
    setCustomer(EMPTY_CUSTOMER);
    setDiscount(0);
  }, []);

  /** Preload an existing order into the cart for admin review/editing. */
  const loadOrder = useCallback((existing: Order) => {
    setItems(
      existing.items.map((it) => ({
        product_id: it.product_id,
        product_code: it.product_code,
        product_name: it.product_name,
        variant_id: it.variant_id,
        variant_name: it.variant_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        subtotal: it.subtotal,
        is_free: it.is_free,
      }))
    );
    setNotes(existing.notes);
    // Carried through the admin's review so approving an order doesn't lose
    // the customer it belongs to.
    setCustomer({
      customer_name: existing.customer_name,
      customer_phone: existing.customer_phone,
      customer_location: existing.customer_location,
    });
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
      ...customer,
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
        t("err.saveOrder", {
          reason: err instanceof Error ? err.message : String(err),
        })
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [
    items,
    notes,
    customer,
    discount,
    submitting,
    submitStatus,
    editingOrderId,
    onOrderComplete,
    t,
  ]);

  const reset = useCallback(() => {
    setOrder(null);
    setItems([]);
    setNotes("");
    setCustomer(EMPTY_CUSTOMER);
    setDiscount(0);
    setEditingOrderId(null);
    setSubmitError(null);
  }, []);

  const totalQty = items.reduce((sum, ci) => sum + ci.quantity, 0);

  return {
    items,
    notes,
    setNotes,
    customer,
    setCustomerField,
    discount,
    setDiscount,
    order,
    submitting,
    submitError,
    add,
    remove,
    addFree,
    qtyOf,
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
