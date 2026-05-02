import { Router, type IRouter } from "express";
import { getJobProgress } from "../services/progressStore";

const router: IRouter = Router();

const STEP_LABELS: Record<string, string> = {
  fetching_store: "Scanning store data...",
  scoring: "Scoring AI representation...",
  simulating_personas: "Simulating Deal Hunter, Trust Verifier, Lifestyle Matcher...",
  detecting_drift: "Detecting temporal drift...",
  complete: "Analysis complete!",
  error: "Analysis failed.",
};

router.get("/analyze/progress/:jobId", (req, res): void => {
  const { jobId } = req.params;
  const progress = getJobProgress(jobId);

  if (!progress) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({
    status: progress.status,
    step: progress.step,
    label: STEP_LABELS[progress.step] ?? progress.step,
    result: progress.status === "complete" ? progress.result : undefined,
    error: progress.status === "error" ? progress.error : undefined,
  });
});

export default router;
