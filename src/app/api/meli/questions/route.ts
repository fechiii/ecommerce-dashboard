/**
 * GET  /api/meli/questions?account=filhos&status=UNANSWERED
 * POST /api/meli/questions  { account, questionId, text }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccount, getAccounts, getPendingQuestions, getAllQuestions, answerQuestion } from "@/lib/meli";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountParam = searchParams.get("account") ?? "all";
  const status = searchParams.get("status") ?? "UNANSWERED";

  try {
    if (accountParam === "all") {
      const accounts = getAccounts();
      const results = await Promise.allSettled(
        accounts.map(async (acc) => {
          const data = status === "UNANSWERED"
            ? await getPendingQuestions(acc, 20)
            : await getAllQuestions(acc, 20);
          return { accountId: acc.id, ...data };
        })
      );
      return NextResponse.json({
        accounts: results.map((r, i) =>
          r.status === "fulfilled"
            ? r.value
            : { accountId: accounts[i].id, total: 0, questions: [], error: (r.reason as Error).message }
        ),
      });
    }

    const account = getAccount(accountParam);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const data = status === "UNANSWERED"
      ? await getPendingQuestions(account, 20)
      : await getAllQuestions(account, 20);

    return NextResponse.json({ accountId: accountParam, ...data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { account: string; questionId: number; text: string };
    const { account: accountId, questionId, text } = body;

    if (!accountId || !questionId || !text?.trim()) {
      return NextResponse.json({ error: "account, questionId y text son requeridos" }, { status: 400 });
    }

    const account = getAccount(accountId);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const result = await answerQuestion(account, questionId, text);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
