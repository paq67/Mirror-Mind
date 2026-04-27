import { Router, type IRouter } from "express";
import { AnalyzeStoreBody } from "@workspace/api-zod";
import { fetchStoreData } from "../services/shopifyService";
import { scoreStore } from "../services/scorerService";
import { simulatePersonas } from "../services/personaService";
import { detectTemporalDrift } from "../services/temporalService";

const router: IRouter = Router();

router.post("/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeStoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.message });
    return;
  }

  // Accept full URLs (https://myfrido.com) or bare domains (myfrido.com)
  const rawInput = parsed.data.storeDomain.trim();
  const { adminToken } = parsed.data;

  const storeDomain = rawInput
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .trim();

  req.log.info({ storeDomain }, "Starting full store analysis");

  try {
    // Step 1: Fetch store data
    const storeData = await fetchStoreData(storeDomain, adminToken ?? undefined);
    req.log.info(
      { storeDomain, productCount: storeData.productCount, accessedViaApi: storeData.accessedViaApi },
      "Store data fetched",
    );

    // Step 2: Run scorer + personas + temporal drift in parallel
    const [scoreResult, personaResults, temporalResult] = await Promise.all([
      scoreStore(storeData),
      simulatePersonas(storeData),
      detectTemporalDrift(storeData),
    ]);

    req.log.info(
      { storeDomain, overallScore: scoreResult.overallScore, confidence: scoreResult.confidence },
      "Analysis complete",
    );

    res.json({
      storeDomain: storeData.domain,
      storeName: storeData.name,
      overallScore: scoreResult.overallScore,
      confidence: scoreResult.confidence,
      confidenceExplanation: scoreResult.confidenceExplanation,
      dimensions: scoreResult.dimensions,
      productCount: storeData.productCount,
      topProducts: scoreResult.scoredProducts.slice(0, 10),
      storeDescription: scoreResult.storeDescription,
      analysisTimestamp: new Date().toISOString(),
      gaps: scoreResult.gaps,
      personas: personaResults,
      temporal: temporalResult,
    });
  } catch (err) {
    req.log.error({ err, storeDomain }, "Analysis failed");
    res.status(500).json({
      error: "Analysis failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
