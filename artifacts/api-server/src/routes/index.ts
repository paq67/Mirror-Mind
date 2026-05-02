import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import simulateRouter from "./simulate";
import compareRouter from "./compare";
import fixRouter from "./fix";
import configRouter from "./config";
import progressRouter from "./progress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(analyzeRouter);
router.use(progressRouter);
router.use(simulateRouter);
router.use(compareRouter);
router.use(fixRouter);

export default router;
