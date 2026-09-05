import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/serverAuth";
import {
  getToken,
  tokenIsFromEnv,
  maskToken,
  getBotInfo,
  getChatIds,
  setChatIds,
  setStoredToken,
  discoverChats,
  sendTo,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Telegram connection, set up from /admin/telegram. Admin only — the bot
// token is a credential, and the chat list says where a shop's orders go.

/** Everything the setup page renders: token state, bot identity, destinations. */
async function status() {
  const token = await getToken();
  const chatIds = await getChatIds();
  if (!token) {
    return {
      configured: false,
      fromEnv: false,
      chatIds,
      bot: null,
      error: null as string | null,
    };
  }
  const info = await getBotInfo(token);
  return {
    configured: true,
    fromEnv: tokenIsFromEnv(),
    // Never the token itself — it only ever travels into this app, not out.
    maskedToken: maskToken(token),
    chatIds,
    bot: info.ok ? info.bot : null,
    error: info.ok ? null : info.error,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await status());
  } catch (err) {
    console.error("Telegram status failed:", err);
    return NextResponse.json(
      { error: "Could not read the Telegram settings." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action : "";

  try {
    switch (action) {
      // ── Save / clear the bot token (only when it isn't set in the env) ──
      case "saveToken": {
        if (tokenIsFromEnv())
          return NextResponse.json(
            {
              error:
                "The token is set by TELEGRAM_BOT_TOKEN in the environment. Change it there.",
            },
            { status: 409 },
          );
        const token = typeof body?.token === "string" ? body.token.trim() : "";
        if (token) {
          // Refuse a token Telegram doesn't recognise rather than storing a
          // dud that only shows up as silence when an order comes in.
          const info = await getBotInfo(token);
          if (!info.ok)
            return NextResponse.json({ error: info.error }, { status: 400 });
        }
        await setStoredToken(token || null);
        return NextResponse.json(await status());
      }

      // ── Find chats that have messaged the bot ──
      case "discover": {
        const token = await getToken();
        if (!token)
          return NextResponse.json(
            { error: "Add the bot token first." },
            { status: 400 },
          );
        const found = await discoverChats(token);
        if (!found.ok)
          return NextResponse.json({ error: found.error }, { status: 502 });
        return NextResponse.json({ chats: found.chats });
      }

      case "addChat": {
        const id = typeof body?.chatId === "string" ? body.chatId.trim() : "";
        // Telegram chat ids are integers; groups and channels are negative.
        if (!/^-?\d+$/.test(id))
          return NextResponse.json(
            { error: "A chat ID is a number, like 123456789 or -1001234567890." },
            { status: 400 },
          );
        await setChatIds([...(await getChatIds()), id]);
        return NextResponse.json(await status());
      }

      case "removeChat": {
        const id = typeof body?.chatId === "string" ? body.chatId.trim() : "";
        await setChatIds((await getChatIds()).filter((c) => c !== id));
        return NextResponse.json(await status());
      }

      // ── Prove it works, end to end ──
      case "test": {
        const token = await getToken();
        if (!token)
          return NextResponse.json(
            { error: "Add the bot token first." },
            { status: 400 },
          );
        const chatIds = await getChatIds();
        if (chatIds.length === 0)
          return NextResponse.json(
            { error: "Add a chat to send to first." },
            { status: 400 },
          );
        const outcomes = await sendTo(
          token,
          chatIds,
          [
            "✅ <b>velina</b>",
            "",
            "تم ربط المتجر بهذه المحادثة بنجاح.",
            "ستصلك الطلبات الجديدة هنا.",
          ].join("\n"),
        );
        return NextResponse.json({ outcomes });
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    console.error(`Telegram action "${action}" failed:`, err);
    return NextResponse.json(
      { error: "Could not save the Telegram settings." },
      { status: 500 },
    );
  }
}
