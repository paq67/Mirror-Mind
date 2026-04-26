import { Router, type IRouter } from "express";
import { CompareCompetitorsBody, CompareCompetitorsResponse } from "@workspace/api-zod";
import { fetchStoreData } from "../services/shopifyService";
import { scoreStore } from "../services/scorerService";

const router: IRouter = Router();

router.post("/compare", async (req, res): Promise<void> => {
  const parsed = CompareCompetitorsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.message });
    return;
  }

  const { storeDomain, adminToken, competitorDomains } = parsed.data;

  req.log.info({ storeDomain, competitorDomains }, "Starting competitor comparison");

  const allDomains = [storeDomain, ...competitorDomains.slice(0, 3)];

  const results = await Promise.allSettled(
    allDomains.map(async (domain) => {
      const storeData = await fetchStoreData(
        domain,
        domain === storeDomain ? (adminToken ?? undefined) : undefined,
      );
      const score = await scoreStore(storeData);
      return { domain, storeData, score };
    }),
  );

  const successResults = results
    .map((r, i) => ({
      domain: allDomains[i]!,
      result: r.status === "fulfilled" ? r.value : null,
    }))
    .filter((r) => r.result !== null);

  const yourResult = successResults.find((r) => r.domain === storeDomain);
  const competitorResults = successResults.filter((r) => r.domain !== storeDomain);

  if (!yourResult?.result) {
    res.status(400).json({ error: "Could not analyze your store" });
    return;
  }

  const yourScore = yourResult.result.score.overallScore;
  const allScores = [yourScore, ...competitorResults.map((r) => r.result!.score.overallScore)];
  const avgCompetitorScore =
    competitorResults.length > 0
      ? competitorResults.reduce((sum, r) => sum + r.result!.score.overallScore, 0) /
        competitorResults.length
      : yourScore;

  const sortedScores = [...allScores].sort((a, b) => b - a);
  const rankPosition = sortedScores.indexOf(yourScore) + 1;

  const yourWeakDimensions = yourResult.result.score.dimensions
    .filter((d) => d.score < 60)
    .map((d) => d.name);

  const topOpportunities = yourWeakDimensions.slice(0, 3).map((dim) => {
    const competitorAvg =
      competitorResults.length > 0
        ? competitorResults.reduce((sum, r) => {
            const found = r.result!.score.dimensions.find((d) => d.name === dim);
            return sum + (found?.score ?? 50);
          }, 0) / competitorResults.length
        : 70;
    return `Improve ${dim} (your score: ${yourResult.result!.score.dimensions.find((d) => d.name === dim)?.score ?? 0} vs competitor avg: ${Math.round(competitorAvg)})`;
  });

  const response = CompareCompetitorsResponse.parse({
    storeDomain: yourResult.result.storeData.domain,
    competitors: competitorResults.map((r) => ({
      domain: r.domain,
      name: r.result!.storeData.name,
      overallScore: r.result!.score.overallScore,
      dimensions: r.result!.score.dimensions,
      strengths: r.result!.score.dimensions
        .filter((d) => d.score >= 70)
        .map((d) => d.name),
    })),
    yourScore,
    averageCompetitorScore: Math.round(avgCompetitorScore),
    rankPosition,
    topOpportunities:
      topOpportunities.length > 0
        ? topOpportunities
        : ["Improve overall AI representation to stay competitive"],
  });

  req.log.info({ storeDomain, rankPosition }, "Comparison complete");
  res.json(response);
});

export default router;
