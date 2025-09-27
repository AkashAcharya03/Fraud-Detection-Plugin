import { z } from "zod";

export const userBehavior = {
  name: "userBehavior",
  config: {
    title: "User Behavior Check",
    description: "Detects suspicious login attempts and abnormal transaction patterns.",
    inputSchema: {
      userId: z.string(),
      passwordAttempt: z.string(),
      successfulLogin: z.boolean(),
      transactionsLastDay: z.number().optional(),
    },
  },
  async execute({ userId, passwordAttempt, successfulLogin, transactionsLastDay = 0 }) {
    if (!global.userLoginAttempts) global.userLoginAttempts = {};
    if (!global.userLoginAttempts[userId]) global.userLoginAttempts[userId] = [];

    const now = Date.now();
    global.userLoginAttempts[userId] = global.userLoginAttempts[userId].filter(
      (a) => now - a.timestamp < 3600_000
    );

    if (!successfulLogin) {
      global.userLoginAttempts[userId].push({ passwordAttempt, timestamp: now });
    }

    const failedAttempts = global.userLoginAttempts[userId].length;
    const uniquePasswords = new Set(global.userLoginAttempts[userId].map(a => a.passwordAttempt));
    const suspicious = failedAttempts > 3 || uniquePasswords.size > 1;

    return {
      content: [
        {
          type: "text",
          text: suspicious
            ? `⚠ Suspicious login for ${userId}. Failed attempts: ${failedAttempts}, unique passwords: ${uniquePasswords.size}.`
            : `✅ User ${userId} behavior normal. Failed: ${failedAttempts}, unique passwords: ${uniquePasswords.size}.`,
        },
        {
          type: "text",
          text: suspicious
            ? "Recommendation: Lock account temporarily and require MFA."
            : "No action needed.",
        },
      ],
    };
  },
};
