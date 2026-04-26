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

  const { storeDomain, adminToken } = parsed.data;

  req.log.info({ storeDomain }, "Starting store analysis");

  const storeData = await fetchStoreData(storeDomain, adminToken ?? undefined);
  const scoreResult = await scoreStore(storeData);

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
});

export default router;
