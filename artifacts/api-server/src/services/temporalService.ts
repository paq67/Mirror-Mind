import { chatCompleteJSON } from "./aiClient";
import type { ShopifyStoreData } from "./shopifyService";

export interface StaleSignal {
  text: string;
  reason: string;
  risk: "High" | "Medium" | "Low";
  type: string;
}

export interface TemporalDriftResult {
  stalenessScore: number;
  staleSignals: StaleSignal[];
  summary: string;
  confidence: "high" | "medium" | "low";
}

export async function detectTemporalDrift(store: ShopifyStoreData): Promise<TemporalDriftResult> {
  const meta = store.scrapedMetadata;
  const currentYear = new Date().getFullYear();

  // Build text corpus to analyze
  const corpus: string[] = [];
  if (meta?.title) corpus.push(meta.title);
  if (meta?.metaDescription) corpus.push(meta.metaDescription);
  if (meta?.headings) corpus.push(...meta.headings);
  corpus.push(...store.products.slice(0, 10).map((p) =>
    (p.body_html ?? "").replace(/<[^>]+>/g, "").slice(0, 200)
  ));

  const combinedText = corpus.join(" ").toLowerCase();

  if (combinedText.length < 50) {
    return {
      stalenessScore: 0,
      staleSignals: [],
      summary: "Insufficient content to detect temporal signals.",
      confidence: "low",
    };
  }

  // Rule-based detection (conservative — high confidence only)
  const ruleBasedSignals: StaleSignal[] = [];

  // RULE 1: Only flag years more than 2 years old, and only if it's a claim
  for (let year = 2000; year <= currentYear - 2; year++) {
    const yearStr = String(year);
    if (combinedText.includes(yearStr)) {
      const claimPhrases = [
        `new for ${yearStr}`, `new in ${yearStr}`, `launched ${yearStr}`,
        `since ${yearStr}`, `est. ${yearStr}`, `established ${yearStr}`,
        `${yearStr} collection`, `${yearStr} model`,
      ];
      const isDirectClaim = claimPhrases.some((p) => combinedText.includes(p));
      if (isDirectClaim) {
        ruleBasedSignals.push({
          text: `Found "${yearStr}" claim in content`,
          reason: `Year ${yearStr} referenced as current/new — AI agents in ${currentYear} may treat this as outdated data`,
          risk: currentYear - year > 3 ? "High" : "Medium",
          type: "year_reference",
        });
        break; // Only report once
      }
    }
  }

  // RULE 2: Check for contradictory return day windows (>3 day difference)
  const dayMatches = combinedText.match(/(\d+)\s*-?\s*days?\s*(return|refund|exchange|policy)/g) ?? [];
  const dayNumbers = dayMatches.map((m) => parseInt(m.match(/\d+/)?.[0] ?? "0")).filter((n) => n > 0);
  if (dayNumbers.length >= 2) {
    const sorted = [...new Set(dayNumbers)].sort((a, b) => a - b);
    if (sorted.length >= 2 && sorted[sorted.length - 1]! - sorted[0]! > 3) {
      ruleBasedSignals.push({
        text: `Conflicting return windows: ${sorted.join(", ")} days`,
        reason: "Contradictory return policy timeframes confuse AI agents about actual policy",
        risk: "High",
        type: "policy_contradiction",
      });
    }
  }

  // RULE 3: "Free shipping" mentioned but $ thresholds conflict
  if (combinedText.includes("free shipping") && combinedText.match(/\$\d+/) !== null) {
    const thresholds = [...combinedText.matchAll(/free\s+shipping[^.]*?\$(\d+)/g)]
      .map((m) => parseInt(m[1]!));
    const uniqueThresholds = [...new Set(thresholds)];
    if (uniqueThresholds.length > 1) {
      ruleBasedSignals.push({
        text: `Multiple free shipping thresholds: ${uniqueThresholds.map((t) => `$${t}`).join(", ")}`,
        reason: "Conflicting shipping thresholds create uncertainty for AI agents evaluating deal quality",
        risk: "Medium",
        type: "shipping_contradiction",
      });
    }
  }

  // If we have enough data, also run an LLM pass to catch semantic issues
  let llmSignals: StaleSignal[] = [];
  if (combinedText.length > 200) {
    try {
      const systemPrompt = `You are analyzing store content for temporal inconsistencies that would confuse AI shopping agents.
Look ONLY for HIGH-CONFIDENCE issues: contradictory dates, stale year references in claims, conflicting policy timeframes.
Do NOT flag general vagueness or marketing language. Only report things you can point to specifically.
Return ONLY valid JSON — no markdown.`;

      const userPrompt = `Store: ${store.name}
Content sample (${combinedText.length} chars):
${combinedText.slice(0, 800)}

Find temporal/consistency issues. Return JSON:
{
  "signals": [
    {
      "text": "exact text that is problematic",
      "reason": "why this confuses AI agents",
      "risk": "High|Medium|Low",
      "type": "year_reference|policy_contradiction|stale_claim|other"
    }
  ]
}
Return empty signals array if nothing found. Max 3 signals.`;

      const result = await chatCompleteJSON<{ signals: StaleSignal[] }>(systemPrompt, userPrompt, 0.2);
      if (Array.isArray(result.signals)) {
        llmSignals = result.signals.slice(0, 3).filter(
          (s) => s.text && s.reason && ["High", "Medium", "Low"].includes(s.risk),
        );
      }
    } catch {
      // LLM pass failed — use rule-based only
    }
  }

  // Merge, deduplicate by type
  const seenTypes = new Set(ruleBasedSignals.map((s) => s.type));
  const mergedSignals: StaleSignal[] = [
    ...ruleBasedSignals,
    ...llmSignals.filter((s) => !seenTypes.has(s.type)),
  ].slice(0, 5);

  const stalenessScore = Math.min(
    mergedSignals.reduce((sum, s) => sum + (s.risk === "High" ? 25 : s.risk === "Medium" ? 15 : 8), 0),
    100,
  );

  const confidence = combinedText.length > 500 ? "high" : combinedText.length > 200 ? "medium" : "low";

  const summary = mergedSignals.length === 0
    ? "No temporal inconsistencies detected — content signals appear consistent."
    : `Detected ${mergedSignals.length} temporal issue${mergedSignals.length > 1 ? "s" : ""}: ${mergedSignals.map((s) => s.type.replace(/_/g, " ")).join(", ")}.`;

  return {
    stalenessScore,
    staleSignals: mergedSignals,
    summary,
    confidence,
  };
}
