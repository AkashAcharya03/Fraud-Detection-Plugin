import { z } from "zod";

export const sessionConsistency = {
  name: "sessionConsistency",
  config: {
    title: "Session Consistency Analyzer",
    description:
      "Tracks session history (IPs, timestamps, geos if provided) and computes an anomaly score and recommendation.",
    inputSchema: {
      session_id: z.string(),
      ip: z.string(),
      geo: z.string().optional(), // country code or region (optional)
      timestamp_ms: z.number().optional(),
      max_history: z.number().optional(), // how many recent records to keep (default 50)
    },
  },
  async execute({
    session_id,
    ip,
    geo = null,
    timestamp_ms = Date.now(),
    max_history = 50,
  }) {
    if (!global.sessionHistory) global.sessionHistory = {};
    if (!global.sessionHistory[session_id]) global.sessionHistory[session_id] = [];

    // append event
    global.sessionHistory[session_id].push({ ip, geo, ts: timestamp_ms });

    // keep only last max_history
    if (global.sessionHistory[session_id].length > max_history) {
      global.sessionHistory[session_id].splice(0, global.sessionHistory[session_id].length - max_history);
    }

    const history = global.sessionHistory[session_id];
    const distinctIps = [...new Set(history.map((h) => h.ip))];
    const distinctGeos = [...new Set(history.map((h) => h.geo).filter(Boolean))];

    // simple anomaly scoring:
    // - more distinct IPs increases score
    // - more distinct geos increases score
    // - frequently changing IPs in short time increases score
    let score = 0;
    score += Math.min(distinctIps.length * 20, 60); // up to 60 points
    score += Math.min(distinctGeos.length * 15, 30); // up to 30 points

    // quick velocity penalty: count events within last 5 minutes
    const fiveMin = 5 * 60 * 1000;
    const now = timestamp_ms;
    const recentCount = history.filter((h) => now - h.ts <= fiveMin).length;
    if (recentCount > 20) score += 10;

    score = Math.max(0, Math.min(100, score));

    const severity = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
    const suspicious = score >= 40;

    const summary = suspicious
      ? `⚠ Session ${session_id} anomaly detected (score ${score}/100, severity ${severity}).`
      : `✅ Session ${session_id} looks consistent (score ${score}/100).`;

    const recommendation = suspicious
      ? severity === "high"
        ? "Action: Immediately invalidate session token and force password reset / MFA."
        : "Recommendation: Step-up authentication (MFA) and monitor."
      : "No action needed.";

    return {
      content: [
        { type: "text", text: summary },
        { type: "text", text: recommendation },
        {
          type: "text",
          text: `Details: ${JSON.stringify({
            session_id,
            score,
            severity,
            distinctIps,
            distinctGeos,
            historyCount: history.length,
            recentCount,
          })}`,
        },
      ],
    };
  },
};
