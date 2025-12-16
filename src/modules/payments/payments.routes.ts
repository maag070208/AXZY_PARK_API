import { Router } from "express";
import * as paymentsController from "./payments.controller";

const router = Router();

router.get("/coaches", paymentsController.getCoachPayments);

export default router;
