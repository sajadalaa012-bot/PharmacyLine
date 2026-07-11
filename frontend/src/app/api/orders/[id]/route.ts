import { NextRequest, NextResponse } from "next/server";
import {
  getOrder,
  replaceOrder,
  deleteOrder,
  validateOrderInput,
  OrderValidationError,
} from "@/lib/orders";
import { isAdminRequest } from "@/lib/serverAuth";
import { OrderStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(id: string): number | null {
  const n = parseInt(id, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}
const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null)
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  const order = await getOrder(id);
  if (!order)
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json(order);
}

// Replace an order's items/notes/discount/status (used to approve or edit).
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null)
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const input = validateOrderInput(body);
    const status: OrderStatus =
      body && body.status === "pending" ? "pending" : "approved";
    const order = await replaceOrder(id, input, status);
    if (!order)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof OrderValidationError)
      return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("Update order failed:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null)
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  const ok = await deleteOrder(id);
  if (!ok)
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
