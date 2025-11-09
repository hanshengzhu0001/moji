const VIBE_PATTERNS: Record<string, RegExp[]> = {
  sad: [
    /\bsad\b/i,
    /feeling down/i,
    /depress/i,
    /\bcry/i,
    /\bunhappy\b/i,
    /heartbroken/i,
    /\bblue\b/i,
    /lonely/i,
    /upset/i,
  ],
  tense: [
    /\bstress/i,
    /\banx/i,
    /worried/i,
    /\bnervous\b/i,
    /\btense\b/i,
    /panic/i,
    /overwhelm/i,
    /burned out/i,
    /burnt out/i,
  ],
  hype: [
    /\bhype/i,
    /\bexcited/i,
    /\bpumped/i,
    /let['’]s go/i,
    /\bwoo/i,
    /\bparty\b/i,
    /\bcelebrat/i,
    /\bwoohoo/i,
    /\bgoooo?\b/i,
  ],
  calm: [
    /\bcalm\b/i,
    /\bchill\b/i,
    /relax/i,
    /peaceful/i,
    /\bzen\b/i,
    /\bserene\b/i,
    /\bcozy\b/i,
    /\blaid back\b/i,
  ],
};

type Vibe = "sad" | "tense" | "hype" | "calm" | "neutral";

export function detectVibeFromMessages(texts: string[], recentWindow = 5): Vibe {
  if (!texts || texts.length === 0) return "neutral";

  const scores: Record<Vibe, number> = {
    sad: 0,
    tense: 0,
    hype: 0,
    calm: 0,
    neutral: 0,
  };

  const recentScores: Record<Vibe, number> = {
    sad: 0,
    tense: 0,
    hype: 0,
    calm: 0,
    neutral: 0,
  };

  texts.forEach((rawText, idx) => {
    const text = (rawText || "").toLowerCase();
    if (!text.trim()) return;

    const weight = Math.max(0.2, 1 - idx * 0.08); // decay weight for older messages

    (["sad", "tense", "hype", "calm"] as Vibe[]).forEach((vibe) => {
      const patterns = VIBE_PATTERNS[vibe];
      if (patterns.some((pattern) => pattern.test(text))) {
        scores[vibe] += weight;
        if (idx < recentWindow) {
          recentScores[vibe] += weight;
        }
      }
    });
  });

  const recentVibe = getTopVibe(recentScores);
  if (recentVibe && recentScores[recentVibe] >= 0.6) {
    return recentVibe;
  }

  const overallVibe = getTopVibe(scores);
  if (!overallVibe) {
    return recentVibe || "neutral";
  }

  const sorted = Object.entries(scores)
    .filter(([vibe]) => vibe !== "neutral")
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0 || sorted[0][1] <= 0) {
    return recentVibe || "neutral";
  }

  if (
    sorted.length > 1 &&
    sorted[0][1] - sorted[1][1] < 0.3 &&
    recentVibe &&
    recentScores[recentVibe] > 0
  ) {
    return recentVibe;
  }

  return sorted[0][0] as Vibe;
}

function getTopVibe(scoreMap: Record<Vibe, number>): Vibe | null {
  let topVibe: Vibe | null = null;
  let topScore = 0;
  (["sad", "tense", "hype", "calm"] as Vibe[]).forEach((vibe) => {
    const score = scoreMap[vibe];
    if (score > topScore) {
      topScore = score;
      topVibe = vibe;
    }
  });
  return topVibe;
}

