import { z } from "zod";
import dns from "node:dns";

export const fakeEmailDetector = {
  name: "fakeEmailDetector",
  config: {
    title: "Fake Email Detector",
    description: "Detects potentially fake or phishing emails by checking headers, domains, and suspicious content.",
    inputSchema: {
      from: z.string(),
      return_path: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      links: z.array(z.string()).optional(),
    },
  },
  async execute({ from, return_path, subject, body, links }) {
    const resolver = dns.promises;
    const highRiskKeywords = ["verify", "urgent", "password", "click", "wire transfer"];
    const suspicious = [];
    let score = 0;

    // Extract domain
    const fromDomain = (from.match(/@([^\s>]+)/) || [])[1]?.toLowerCase();

    // SPF/DMARC presence
    let hasSpf = false, hasDmarc = false;
    if (fromDomain) {
      try {
        const txts = await resolver.resolveTxt(fromDomain).catch(() => []);
        hasSpf = txts.flat().join(" ").includes("v=spf1");
        const dmarcTxts = await resolver.resolveTxt(`_dmarc.${fromDomain}`).catch(() => []);
        hasDmarc = dmarcTxts.flat().join(" ").includes("v=DMARC1");
      } catch (_) {}
    }
    if (!hasSpf) suspicious.push("Missing SPF record"), score += 10;
    if (!hasDmarc) suspicious.push("Missing DMARC record"), score += 10;

    // Return-Path mismatch
    if (return_path) {
      const rpDomain = (return_path.match(/@([^\s>]+)/) || [])[1]?.toLowerCase();
      if (rpDomain && fromDomain && rpDomain !== fromDomain) {
        suspicious.push("Return-Path mismatch");
        score += 20;
      }
    }

    // Keyword scan
    const text = `${subject || ""} ${body || ""}`.toLowerCase();
    const foundKeywords = highRiskKeywords.filter((k) => text.includes(k));
    if (foundKeywords.length) {
      suspicious.push(`Keywords: ${foundKeywords.join(", ")}`);
      score += 20;
    }

    // Links check
    if (links?.length) {
      const badLinks = links.filter((l) => fromDomain && !l.includes(fromDomain));
      if (badLinks.length) {
        suspicious.push(`Suspicious links: ${badLinks.join(", ")}`);
        score += 20;
      }
    }

    const isFraud = score >= 40 || suspicious.length > 0;

    return {
      content: [
        {
          type: "text",
          text: isFraud
            ? `⚠ Likely fraudulent email from ${from} (score ${score}/100). Issues: ${suspicious.join("; ")}`
            : `✅ Email from ${from} looks safe (score ${score}/100).`,
        },
        {
          type: "text",
          text: isFraud
            ? "Action: Flag or block this email."
            : "No action needed.",
        },
      ],
    };
  },
};
