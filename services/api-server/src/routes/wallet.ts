import { mutateWalletBalance, pool, withTransaction } from "@quiz-app/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate } from "../lib/auth.js";

const walletAmountSchema = z.object({
  amount: z.number().positive().max(100000)
});

export async function walletRoutes(app: FastifyInstance) {
  app.get("/wallet/balance", { preHandler: authenticate }, async (request) => ({
    wallet_balance: request.user.wallet_balance
  }));

  app.get("/wallet/transactions", { preHandler: authenticate }, async (request) => {
    const result = await pool.query<{
      id: string;
      type: "credit" | "debit";
      reason: "entry_fee" | "prize" | "refund" | "topup" | "manual_topup";
      amount: string;
      balance_before: string;
      balance_after: string;
      reference_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>(
      `
        SELECT
          id,
          type,
          reason,
          amount,
          balance_before,
          balance_after,
          reference_id,
          metadata,
          created_at
        FROM wallet_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [request.user.id]
    );

    return {
      transactions: result.rows
    };
  });

  app.post("/wallet/add-money", { preHandler: authenticate }, async (request) => {
    const body = walletAmountSchema.parse(request.body);

    // TEMPORARY PAYMENT NOTE:
    // This self-serve add-money endpoint exists only because a real payment gateway
    // is not available yet. Replace this endpoint when Razorpay or another provider
    // is integrated later.
    const result = await withTransaction(async (client) =>
      mutateWalletBalance(client, {
        userId: request.user.id,
        amountPaise: Math.round(body.amount * 100),
        type: "credit",
        reason: "manual_topup",
        metadata: {
          source: "temporary_add_money_button"
        }
      })
    );

    return {
      success: true,
      wallet_balance: (result.balanceAfterPaise / 100).toFixed(2)
    };
  });
}
