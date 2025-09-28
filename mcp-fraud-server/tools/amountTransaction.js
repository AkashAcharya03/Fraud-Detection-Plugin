import { z } from "zod";

export const amountTransaction = {
  name: "amountTransaction",
  config: {
    title: "Transaction Amount Analyzer",
    description:
      "Flags unusually large or inconsistent transaction amounts compared to user’s past history.",
    inputSchema: {
      user_id: z.string(),
      transaction_id: z.string(),
      amount: z.number(), // transaction amount
      currency: z.string().optional(), // optional, e.g., 'USD'
      timestamp_ms: z.number().optional(), // event time
      avg_window: z.number().optional(), // number of transactions to use for average (default 20)
      high_risk_threshold: z.number().optional(), // absolute high amount to always flag (default 10000)
    },
  },
  async execute({
    user_id,
    transaction_id,
    amount,
    currency = "USD",
    timestamp_ms = Date.now(),
    avg_window = 20,
    high_risk_threshold = 10000,
  }) {
    if (!global.transactionHistory) global.transactionHistory = {};
    if (!global.transactionHistory[user_id]) global.transactionHistory[user_id] = [];

    // append transaction
    global.transactionHistory[user_id].push({ transaction_id, amount, ts: timestamp_ms });

    // keep only last avg_window
    if (global.transactionHistory[user_id].length > avg_window) {
      global.transactionHistory[user_id].splice(
        0,
        global.transactionHistory[user_id].length - avg_window
      );
    }

    const history = global.transactionHistory[user_id];
    const avgAmount =
      history.reduce((sum, t) => sum + t.amount, 0) / history.length || 0;

    // scoring
    let score = 0;
    let reasons = [];

    if (amount > high_risk_threshold) {
      score += 70;
      reasons.push(`Amount ${amount} > high-risk threshold ${high_risk_threshold}.`);
    }

    if (avgAmount > 0 && amount > avgAmount * 5) {
      score += 30;
      reasons.push(`Amount ${amount} is >5x the user’s average (${avgAmount.toFixed(2)}).`);
    }

    if (avgAmount > 0 && amount < avgAmount * 0.1) {
      score += 10;
      reasons.push(`Amount ${amount} is unusually small (<10% of average ${avgAmount.toFixed(2)}).`);
    }

    score = Math.max(0, Math.min(100, score));
    const severity = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
    const suspicious = score >= 40;

    const summary = suspicious
      ? `⚠ Suspicious transaction ${transaction_id} for user ${user_id}: amount ${amount} ${currency} (score ${score}, severity ${severity}).`
      : `✅ Transaction ${transaction_id} for user ${user_id} looks normal (amount ${amount} ${currency}).`;

    const recommendation = suspicious
      ? severity === "high"
        ? "Action: Block or hold transaction pending manual review."
        : "Recommendation: Escalate for verification (MFA, step-up auth)."
      : "No action needed.";

    return {
      content: [
        { type: "text", text: summary },
        { type: "text", text: recommendation },
        {
          type: "text",
          text: `Details: ${JSON.stringify({
            user_id,
            transaction_id,
            amount,
            avgAmount: avgAmount.toFixed(2),
            historyCount: history.length,
            score,
            severity,
            reasons,
          })}`,
        },
      ],
    };
  },
};
