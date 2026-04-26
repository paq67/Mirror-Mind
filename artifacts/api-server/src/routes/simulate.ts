import { Router, type IRouter } from "express";
import { SimulatePersonaBody, SimulatePersonaResponse } from "@workspace/api-zod";
import { fetchStoreData } from "../services/shopifyService";
import { chatCompleteJSON } from "../services/aiClient";

const router: IRouter = Router();

const PERSONA_DESCRIPTIONS: Record<string, string> = {
  chatgpt: "ChatGPT Shopping (OpenAI's shopping agent integrated with GPT-4o). It prioritizes structured product data, clear descriptions, trust signals like verified reviews, return policies, and well-organized categories. It favors stores with rich schema markup and semantic clarity.",
  perplexity: "Perplexity Shopping. It heavily relies on web content quality, recency, and how well a store answers natural language shopping queries. It values comprehensive product descriptions, comparison-friendly specs, and editorial-quality content.",
  google: "Google Shopping AI (Google's AI-powered shopping recommendations). It prioritizes structured data (schema.org), SEO signals, merchant center feed quality, review ratings, competitive pricing, and brand authority signals.",
};

router.post("/simulate", async (req, res): Promise<void> => {
  const parsed = SimulatePersonaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.message });
    return;
  }

  const { storeDomain, adminToken, persona, query } = parsed.data;

  req.log.info({ storeDomain, persona, query }, "Simulating AI persona");

  const storeData = await fetchStoreData(storeDomain, adminToken ?? undefined);
  const personaDescription = PERSONA_DESCRIPTIONS[persona] ?? PERSONA_DESCRIPTIONS.chatgpt!;

  const systemPrompt = `You are ${personaDescription}

A user asked you this shopping query and you need to decide how you would respond based on the store's data quality. Be realistic and critical — AI shopping agents are selective. Return ONLY valid JSON.`;

  const productSample = storeData.products.slice(0, 5).map((p) => ({
    title: p.title,
    descriptionLength: (p.body_html ?? "").replace(/<[^>]+>/g, "").length,
    tags: p.tags,
    hasImages: p.images?.length > 0,
    imageAltTexts: p.images?.filter((i) => i.alt).length ?? 0,
  }));

  const userPrompt = `Shopping Query: "${query}"

Store Being Evaluated:
- Name: ${storeData.name}
- Domain: ${storeData.domain}
- Products found: ${storeData.productCount}
- Product sample: ${JSON.stringify(productSample, null, 2)}

As ${persona === "chatgpt" ? "ChatGPT Shopping" : persona === "perplexity" ? "Perplexity" : "Google Shopping AI"}, would you recommend this store for this query?

Return this exact JSON:
{
  "wouldRecommend": true|false,
  "confidenceScore": 0-100,
  "simulatedResponse": "The exact text you would show the user when they ask '${query}' — 2-4 sentences, written as if you are the AI agent speaking directly to the shopper",
  "reasoning": "2-3 sentences explaining WHY you would or would not recommend this store — from the AI agent's perspective",
  "missingSignals": ["Signal 1 this AI agent looks for but couldn't find", "Signal 2"],
  "strengths": ["Strength 1 of this store for AI recommendations", "Strength 2"],
  "weaknesses": ["Weakness 1 that reduces recommendation probability", "Weakness 2"]
}`;

  interface SimulationResult {
    wouldRecommend: boolean;
    confidenceScore: number;
    simulatedResponse: string;
    reasoning: string;
    missingSignals: string[];
    strengths: string[];
    weaknesses: string[];
  }

  const result = await chatCompleteJSON<SimulationResult>(systemPrompt, userPrompt);

  const response = SimulatePersonaResponse.parse({
    persona,
    query,
    storeDomain: storeData.domain,
    wouldRecommend: result.wouldRecommend,
    confidenceScore: result.confidenceScore,
    simulatedResponse: result.simulatedResponse,
    reasoning: result.reasoning,
    missingSignals: result.missingSignals,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
  });

  req.log.info({ storeDomain, persona, wouldRecommend: result.wouldRecommend }, "Simulation complete");
  res.json(response);
});

export default router;
