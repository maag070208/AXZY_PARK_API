import { Router } from "express";
import { getSystemConfig, updateSystemConfig } from "./config.controller";

const router = Router();

router.get("/", getSystemConfig);
router.put("/", updateSystemConfig);

export default router;
