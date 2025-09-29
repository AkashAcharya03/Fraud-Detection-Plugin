import { z } from "zod";

export const geoDevice = {
  name: "geoDevice",
  config: {
    title: "Geo Device Check",
    description: "Flags and blocks devices logging in from multiple locations or high-risk regions.",
    inputSchema: {
      device_id: z.string(),
      remote_address: z.string(),
      geo: z.string(),
    },
  },
  async execute({ device_id, remote_address, geo }) {
    if (!global.deviceLocations) global.deviceLocations = {};
    const highRiskCountries = [""];

    if (!global.deviceLocations[device_id]) {
      global.deviceLocations[device_id] = { ips: {}, lastCountry: geo };
    }

    const deviceLog = global.deviceLocations[device_id];
    const previousCountries = Object.values(deviceLog.ips);

    deviceLog.ips[remote_address] = geo;
    const uniqueCountries = [...new Set(Object.values(deviceLog.ips))];

    const mismatch = uniqueCountries.length > 1;
    const risky = highRiskCountries.includes(geo);
    const suspicious = mismatch || risky;
    const block = mismatch;

    return {
      content: [
        {
          type: "text",
          text: suspicious
            ? `⚠ Suspicious login for device ${device_id} from IP ${remote_address}: ${geo}, previous: ${previousCountries.join(", ")}${risky ? " (high-risk)" : ""}.`
            : `✅ Device ${device_id} login normal from ${geo}.`,
        },
        {
          type: "text",
          text: block
            ? "Action: Block this session due to geo mismatch."
            : risky
            ? "Recommendation: Escalate immediately (high-risk region)."
            : "No action needed.",
        },
      ],
    };
  },
};
