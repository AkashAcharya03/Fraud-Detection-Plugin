import { z } from "zod";

export const ipVelocity = {
  name: "ipVelocity",
  config: {
    title: "IP Velocity Check",
    description: "Detects too many requests from the same IP in a short period",
    inputSchema: { remote_address: z.string() },
  },
  async execute({ remote_address }) {
    if (!global.requestLogs) global.requestLogs = {};
    const now = Date.now();
    if (!global.requestLogs[remote_address]) global.requestLogs[remote_address] = [];
    global.requestLogs[remote_address] = global.requestLogs[remote_address].filter((t) => now - t < 90000);
    global.requestLogs[remote_address].push(now);

    const count = global.requestLogs[remote_address].length;
    const flagged = count > 1;

    return {
      content: [
        {
          type: "text",
          text: flagged
            ? `⚠ Too many requests from IP ${remote_address} (${count} in last 90s)`
            : `✅ IP ${remote_address} activity normal (${count} in last 90s)`,
        },
        {
          type: "text",
          text: `Raw details: ${JSON.stringify({ remote_address, flagged, count })}`,
        },
      ],
    };
  },
};
