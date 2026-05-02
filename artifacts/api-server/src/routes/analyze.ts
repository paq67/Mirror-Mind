import { Router, type IRouter } from "express";
import { AnalyzeStoreBody } from "@workspace/api-zod";
import { fetchStoreData } from "../services/shopifyService";
import { scoreStore } from "../services/scorerService";
import { simulatePersonas } from "../services/personaService";
import { detectTemporalDrift } from "../services/temporalService";
import { createJob, updateJobStep, completeJob, failJob } from "../services/progressStore";

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

  // Use token from request, or fall back to the server-side secret
  const resolvedToken = (adminToken && adminToken.trim()) || process.env.SHOPIFY_ADMIN_TOKEN || undefined;

  // Create a job for progress tracking
  const jobId = createJob();

  req.log.info({ storeDomain, hasToken: !!resolvedToken, jobId }, "Starting full store analysis");

  // Respond immediately with the job ID
  res.json({ jobId });

  // Run analysis asynchronously
  (async () => {
    try {
      // Step 1: Fetch store data
      updateJobStep(jobId, "fetching_store");
      req.log.info({ storeDomain, jobId }, "Step: fetching store data");
      const storeData = await fetchStoreData(storeDomain, resolvedToken);
      req.log.info(
        { storeDomain, productCount: storeData.productCount, accessedViaApi: storeData.accessedViaApi },
        "Store data fetched",
      );

      // Step 2: Score store
      updateJobStep(jobId, "scoring");
      req.log.info({ storeDomain, jobId }, "Step: scoring AI representation");
      const scoreResult = await scoreStore(storeData);

      // Step 3: Simulate personas
      updateJobStep(jobId, "simulating_personas");
      req.log.info({ storeDomain, jobId }, "Step: simulating personas");
      const personaResults = await simulatePersonas(storeData);

      // Step 4: Detect temporal drift
      updateJobStep(jobId, "detecting_drift");
      req.log.info({ storeDomain, jobId }, "Step: detecting temporal drift");
      const temporalResult = await detectTemporalDrift(storeData);

      req.log.info(
        { storeDomain, overallScore: scoreResult.overallScore, confidence: scoreResult.confidence, jobId },
        "Analysis complete",
      );

      completeJob(jobId, {
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
        enhancedAnalysis: storeData.accessedViaApi,
      });
    } catch (err) {
      req.log.error({ err, storeDomain, jobId }, "Analysis failed");
      const message = err instanceof Error ? err.message : "Unknown error";
      // Classify error for better frontend handling
      let errorCode = "ANALYSIS_FAILED";
      if (message.includes("ENOTFOUND") || message.includes("ECONNREFUSED")) {
        errorCode = "STORE_UNREACHABLE";
      } else if (message.includes("token") || message.includes("unauthorized") || message.includes("401")) {
        errorCode = "INVALID_TOKEN";
      } else if (message.includes("scrape") || message.includes("No product data")) {
        errorCode = "SCRAPING_FAILED";
      }
      failJob(jobId, JSON.stringify({ code: errorCode, message }));
    }
  })();
});

export default router;
