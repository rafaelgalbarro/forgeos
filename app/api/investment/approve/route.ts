import { NextRequest, NextResponse } from "next/server";
import {
  isFounderTelegramChat,
  processOrderApproval,
  type ApprovalAction,
} from "@/lib/investment/order-approval-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/investment/approve?approvalId=XXX&action=approve|reject
 * Semi-automatic Telegram approval bridge — founder-only via TELEGRAM_CHAT_ID.
 */
export async function POST(req: NextRequest) {
  try {
    const approvalId = req.nextUrl.searchParams.get("approvalId")?.trim() ?? "";
    const actionRaw = req.nextUrl.searchParams.get("action")?.trim().toLowerCase() ?? "";

    if (!approvalId) {
      return NextResponse.json({ ok: false, error: "approvalId required" }, { status: 400 });
    }
    if (actionRaw !== "approve" && actionRaw !== "reject") {
      return NextResponse.json(
        { ok: false, error: "action must be approve or reject" },
        { status: 400 },
      );
    }
    const action = actionRaw as ApprovalAction;

    const chatId =
      req.nextUrl.searchParams.get("chatId") ??
      req.headers.get("x-telegram-chat-id") ??
      undefined;

    const body = (await req.json().catch(() => ({}))) as { chatId?: string | number };
    const resolvedChatId = chatId ?? body.chatId;

    if (resolvedChatId != null && !isFounderTelegramChat(resolvedChatId)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized — TELEGRAM_CHAT_ID mismatch" },
        { status: 403 },
      );
    }

    const result = await processOrderApproval({
      approvalId,
      action,
      chatId: resolvedChatId,
      skipFounderCheck: resolvedChatId == null,
    });

    if (!result.ok) {
      const status = result.error?.includes("not found") ? 404 : 423;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Approval failed" },
      { status: 500 },
    );
  }
}
