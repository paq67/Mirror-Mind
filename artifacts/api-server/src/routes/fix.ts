import { Router, type IRouter } from "express";
import { GenerateFixesBody, GenerateFixesResponse } from "@workspace/api-zod";
import { fetchStoreData } from "../services/shopifyService";
import { scoreStore } from "../services/scorerService";
import { chatCompleteJSON } from "../services/aiClient";

const router: IRouter = Router();

router.post("/fix", async (req, res): Promise<void> => {
  const parsed = GenerateFixesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.message });
    return;
  }

  const { storeDomain, adminToken, analysisData } = parsed.data;

  req.log.info({ storeDomain }, "Generating fix recommendations");

  let scoreResult;
  let storeName = storeDomain;

  if (analysisData && typeof analysisData === "object") {
    scoreResult = analysisData;
    storeName = (analysisData as Record<string, unknown>).storeName as string ?? storeDomain;
  } else {
    const storeData = await fetchStoreData(storeDomain, adminToken ?? undefined);
    storeName = storeData.name;
    scoreResult = await scoreStore(storeData);
  }

  const systemPrompt = `You are an AI representation optimization expert who helps Shopify merchants improve how AI shopping agents (ChatGPT Shopping, Perplexity, Google Shopping AI) discover and recommend their stores.

You create specific, actionable fix plans ranked by business impact and implementation effort. Each fix must have concrete action steps that a merchant can implement today. Return ONLY valid JSON.`;

  const userPrompt = `Store: ${storeName} (${storeDomain})

Current Analysis Data:
${JSON.stringify(scoreResult, null, 2)}

Generate a comprehensive fix plan. Return this exact JSON structure:
{
  "fixes": [
    {
      "id": "fix_001",
      "title": "Short descriptive title",
      "category": "Product Descriptions|SEO & Discoverability|Trust Signals|Review Coverage|Structured Data|Content Freshness",
      "priority": "critical|high|medium|low",
      "effort": "low|medium|high",
      "impact": "low|medium|high",
      "scoreGain": 1-15,
      "description": "2-3 sentences explaining what to fix and why AI agents need this",
      "actionSteps": ["Step 1: specific action", "Step 2: specific action", "Step 3: specific action"],
      "exampleBefore": "Optional: example of current bad state",
      "exampleAfter": "Optional: example of improved state"
    }
  ]
}

Rules:
- Generate 8-12 fixes total
- Prioritize by: (1) critical severity gaps first, (2) high impact + low effort quick wins
- Be extremely specific and actionable — no vague advice like "improve descriptions"
- scoreGain should reflect realistic improvement to the 0-100 overall score
- Vary categories — don't generate all fixes for one category`;

  interface FixResult {
    fixes: Array<{
      id: string;
      title: string;
      category: string;
      priority: "critical" | "high" | "medium" | "low";
      effort: "low" | "medium" | "high";
      impact: "low" | "medium" | "high";
      scoreGain: number;
      description: string;
      actionSteps: string[];
      exampleBefore?: string;
      exampleAfter?: string;
    }>;
  }

  const result = await chatCompleteJSON<FixResult>(systemPrompt, userPrompt);

  const fixes = result.fixes.map((f, i) => ({
    ...f,
    id: f.id || `fix_${String(i + 1).padStart(3, "0")}`,
  }));

  const quickWins = fixes.filter((f) => f.effort === "low" && f.impact !== "low");

  const priorityMatrix = fixes.map((f, i) => ({
    fixId: f.id,
    effort: f.effort,
    impact: f.impact,
    rank: i + 1,
  }));

  const estimatedScoreGain = Math.min(
    fixes.reduce((sum, f) => sum + f.scoreGain, 0),
    40,
  );

  const response = GenerateFixesResponse.parse({
    storeDomain,
    totalFixes: fixes.length,
    estimatedScoreGain,
    fixes,
    quickWins,
    priorityMatrix,
  });

  req.log.info({ storeDomain, totalFixes: fixes.length }, "Fix plan generated");
  res.json(response);
});

export default router;
