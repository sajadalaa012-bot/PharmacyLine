import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders, validateOrderInput, OrderValidationError } from "@/lib/orders";
import { isAdminRequest } from "@/lib/serverAuth";
import { OrderStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: place an order from the storefront (or admin POS).
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const input = validateOrderInput(body);
    const status: OrderStatus =
      body && body.status === "approved" ? "approved" : "pending";
    const order = await createOrder(input, status);
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrderValidationError)
      return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("Create order failed:", err);
    return NextResponse.json(
      { error: "Could not place the order. Please try again." },
      { status: 500 },
    );
  }
}

// Admin only: all orders, newest first.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listOrders());
  } catch (err) {
    console.error("List orders failed:", err);
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }
}
