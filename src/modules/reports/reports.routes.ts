import { Router } from "express";
import { 
    getDashboardMetrics, 
    getReportList,
    getFinancialReport,
    getOperatorsReport,
    getInventoryReport,
    getOccupancyReport,
    getDebtorsReport
} from "./reports.controller";

const router = Router();

router.get("/dashboard", getDashboardMetrics);
router.get("/list", getReportList);

// PDF Reports
router.get("/financial/pdf", getFinancialReport);
router.get("/operators/pdf", getOperatorsReport);
router.get("/inventory/pdf", getInventoryReport);
router.get("/occupancy/pdf", getOccupancyReport);
router.get("/debtors/pdf", getDebtorsReport);

export default router;
