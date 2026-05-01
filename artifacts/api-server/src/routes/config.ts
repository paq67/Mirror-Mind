import { Router } from "express";

const router = Router();

router.get("/config", (_req, res) => {
  res.json({ shopifyConfigured: false });
});

export default router;
