import { NextRequest, NextResponse } from "next/server";
import {
  handleTelegramCallback,
  handleTelegramCommand,
} from "@/lib/notifications/telegram-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/telegram/webhook — Telegram updates (webhook or internal poll relay). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: { text?: string; chat?: { id?: number } };
      callback_query?: {
        id?: string;
        data?: string;
        from?: { id?: number };
        message?: { chat?: { id?: number } };
      };
    };

    const expectedChat = process.env.TELEGRAM_CHAT_ID?.trim();
    const chatId =
      body.message?.chat?.id?.toString() ??
      body.callback_query?.message?.chat?.id?.toString() ??
      body.callback_query?.from?.id?.toString();
    if (expectedChat && chatId && chatId !== expectedChat) {
      return NextResponse.json({ ok: true, ignored: "chat_mismatch" });
    }

    if (body.message?.text) {
      await handleTelegramCommand(body.message.text);
    }

    if (body.callback_query?.data && body.callback_query.id) {
      const callbackChatId =
        body.callback_query.message?.chat?.id ??
        body.callback_query.from?.id ??
        body.message?.chat?.id;
      await handleTelegramCallback(
        body.callback_query.data,
        body.callback_query.id,
        callbackChatId,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TelegramWebhook]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
