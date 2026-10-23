import { MODERATION_CONFIG } from "./moderation-config.mjs";

const validResults = new Set(["approved", "needs_review", "rejected"]);

/** @returns {{ result: "approved" | "needs_review" | "rejected", reason: string }} */
export function decisionFromScores(scores) {
  const explicit = Math.max(scores.Porn ?? 0, scores.Hentai ?? 0);
  const sexy = scores.Sexy ?? 0;

  if (explicit >= MODERATION_CONFIG.rejectExplicit) {
    return { result: "rejected", reason: "The image appears sexually explicit and cannot be uploaded." };
  }
  if (explicit >= MODERATION_CONFIG.reviewExplicit || sexy >= MODERATION_CONFIG.reviewSexy) {
    return { result: "needs_review", reason: "The image needs a moderator review before it can be shown." };
  }
  return { result: "approved", reason: "The image passed the automated content check." };
}

/** @returns {Promise<{ result: "approved" | "needs_review" | "rejected", reason: string }>} */
export async function runModerationProvider(run, timeoutMs = MODERATION_CONFIG.timeoutMs) {
  let timer;
  try {
    const response = await Promise.race([
      Promise.resolve().then(run),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("moderation-timeout")), timeoutMs);
      }),
    ]);
    if (!response || !validResults.has(response.result) || typeof response.reason !== "string") {
      throw new Error("invalid-moderation-response");
    }
    return response;
  } catch {
    return {
      result: "needs_review",
      reason: "The image check could not be completed; it is hidden until a moderator reviews it.",
    };
  } finally {
    clearTimeout(timer);
  }
}
