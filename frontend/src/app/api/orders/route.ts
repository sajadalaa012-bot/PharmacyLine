import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  listOrders,
  validateCreateInput,
  OrderValidationError,
} from "@/lib/orders";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: a customer places an order from the storefront.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const input = validateCreateInput(body);
    const order = await createOrder(input);
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Create order failed:", err);
    return NextResponse.json(
      { error: "Could not place the order. Please try again." },
      { status: 500 },
    );
  }
}

// Admin only: list orders with search / filter / pagination.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sp = req.nextUrl.searchParams;
    const toInt = (v: string | null, d: number) => {
      const n = v ? parseInt(v, 10) : NaN;
      return Number.isFinite(n) ? n : d;
    };
    const result = await listOrders({
      search: sp.get("search") ?? undefined,
      order_status: sp.get("order_status") ?? undefined,
      payment_status: sp.get("payment_status") ?? undefined,
      dateFrom: sp.get("dateFrom") ?? undefined,
      dateTo: sp.get("dateTo") ?? undefined,
      page: toInt(sp.get("page"), 1),
      pageSize: toInt(sp.get("pageSize"), 20),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("List orders failed:", err);
    return NextResponse.json(
      { error: "Could not load orders." },
      { status: 500 },
    );
  }
}
