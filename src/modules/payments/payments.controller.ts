import { Request, Response } from "express";
import * as paymentsService from "./payments.service";
import { createTResult } from "@src/core/mappers/tresult.mapper";

export const getCoachPayments = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, coachId } = req.query;
    
    let start = startDate ? new Date(String(startDate)) : undefined;
    let end = endDate ? new Date(String(endDate)) : undefined;

    // Default to current week (Mon-Sun) if dates missing
    if (!start || !end) {
        const now = new Date();
        const day = now.getDay(); // 0 is Sun
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        start = new Date(now.setDate(diff));
        start.setHours(0,0,0,0);
        
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23,59,59,999);
    }

    const result = await paymentsService.getCoachPayments({
        startDate: start,
        endDate: end,
        coachId: coachId ? Number(coachId) : undefined
    });

    res.json(createTResult(result));
  } catch (error: any) {
    res.status(500).json(createTResult(null, [error.message]));
  }
};
