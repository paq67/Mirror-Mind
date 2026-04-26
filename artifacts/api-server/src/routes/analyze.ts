import { Router, type IRouter } from "express";
import { AnalyzeStoreBody, AnalyzeStoreResponse } from "@workspace/api-zod";
import { fetchStoreData } from "../services/shopifyService";
import { scoreStore } from "../services/scorerService";

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

  // Normalize: strip protocol and trailing slash to get a clean domain
  const storeDomain = rawInput
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .trim();

  req.log.info({ storeDomain, rawInput }, "Starting store analysis");

  try {
    const storeData = await fetchStoreData(storeDomain, adminToken ?? undefined);
    req.log.info(
      {
        storeDomain,
        productCount: storeData.productCount,
        accessedViaApi: storeData.accessedViaApi,
        hasScrapedMetadata: !!storeData.scrapedMetadata,
      },
      "Store data fetched",
    );

    const scoreResult = await scoreStore(storeData);
    req.log.info({ storeDomain, overallScore: scoreResult.overallScore }, "Scoring complete");

    const response = AnalyzeStoreResponse.parse({
      storeDomain: storeData.domain,
      storeName: storeData.name,
      overallScore: scoreResult.overallScore,
      dimensions: scoreResult.dimensions,
      productCount: storeData.productCount,
      topProducts: scoreResult.scoredProducts.slice(0, 10),
      storeDescription: scoreResult.storeDescription,
      analysisTimestamp: new Date().toISOString(),
      gaps: scoreResult.gaps,
    });

    req.log.info({ storeDomain, overallScore: scoreResult.overallScore }, "Analysis complete");
    res.json(response);
  } catch (err) {
    req.log.error({ err, storeDomain }, "Analysis failed");
    res.status(500).json({
      error: "Analysis failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
