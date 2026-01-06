import { Request, Response } from "express";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { prismaClient as prisma } from "../../core/config/database";

const CONFIG_KEY = "PARKING_SETTINGS";

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Get Today's Income
    // We sum up extra costs and entry costs based on exits today.
    // Assuming entry status EXITED and exit date is today.
    const entriesToday = await prisma.vehicleEntry.findMany({
      where: {
        status: "EXITED",
        exit: {
            exitDate: {
                gte: startOfDay,
                lte: endOfDay,
            }
        }
      },
      include: {
        extraCosts: true,
        exit: true,
      }
    });

    let todaysIncome = 0;
    
    for (const entry of entriesToday) {
        // Use stored finalCost from exit if available
        let parkingCost = entry.exit?.finalCost || 0;
        
        // Fallback calculation for old records if needed (optional)
        if (parkingCost === 0 && entry.exit?.exitDate) {
             const HOURLY_RATE = 10; // Legacy fallback
             const exitTime = new Date(entry.exit.exitDate).getTime();
             const entryTime = new Date(entry.entryDate).getTime();
             const durationHours = Math.ceil((exitTime - entryTime) / (1000 * 60 * 60));
             parkingCost = durationHours * HOURLY_RATE;
        }

        // Extra Costs
        const extraCostsSum = entry.extraCosts.reduce((sum, cost) => sum + cost.amount, 0);

        todaysIncome += (parkingCost + extraCostsSum);
    }

    // 2. Cars Inside (Active entries)
    const carsInside = await prisma.vehicleEntry.count({
      where: {
        status: { in: ["ACTIVE", "MOVED"] },
      },
    });

    // 3. Max Capacity
    const config = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    });
    const maxCapacity = (config?.value as any)?.maxCapacity || 100;
    
    // Avoid division by zero
    const occupancyPercentage = maxCapacity > 0 
        ? Math.round((carsInside / maxCapacity) * 100)
        : 0;

    // 4. Pending Movements
    const pendingMovements = await prisma.vehicleMovement.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    // 5. Active Keys
    const activeKeys = await prisma.keyAssignment.count({
      where: {
        status: "ACTIVE",
      },
    });

    // 6. Top 5 Debtors (Entries active with longest duration -> highest potential cost)
    // Ordered by entryDate ascending (oldest first)
    const topDebtors = await prisma.vehicleEntry.findMany({
      where: {
        status: { in: ["ACTIVE", "MOVED"] },
      },
      orderBy: {
        entryDate: 'asc',
      },
      take: 5,
      select: {
          id: true,
          entryDate: true,
          brand: true,
          model: true,
          plates: true,
          user: { 
              select: {
                  name: true,
                  lastName: true
              }
          }
      }
    });

    // 7. Top 5 Operators
    // Placeholder logic
    const topOperators: any[] = [];

    return res.status(200).json(createTResult({
        todaysIncome,
        carsInside,
        occupancyPercentage,
        pendingMovements,
        activeKeys,
        topDebtors: topDebtors.map(d => ({
            id: d.id,
            entryTime: d.entryDate, // Mapping to frontend expectation 'entryTime'
            vehicle: {
                plate: d.plates,
                brand: d.brand,
                model: d.model
            },
            client: d.user
        })),
        topOperators
    }));

  } catch (error: any) {
    return res.status(500).json(createTResult(null, error.message));
  }
};

export const getReportList = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const whereClause: any = {};

        if (startDate && endDate) {
            const start = new Date(startDate as string);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);

            whereClause.entryDate = {
                gte: start,
                lte: end
            };
        }

        const data = await prisma.vehicleEntry.findMany({
            where: whereClause,
            include: {
                user: true,
                exit: true,
                extraCosts: true
            },
            orderBy: {
                entryDate: 'desc'
            }
        });

        const result = data.map(entry => {
            const extraCostsSum = entry.extraCosts.reduce((acc, curr) => acc + curr.amount, 0);
            const finalCost = entry.exit?.finalCost || 0;
            const total = finalCost + extraCostsSum;

            return {
                id: entry.id,
                entryDate: entry.entryDate,
                exitDate: entry.exit?.exitDate,
                status: entry.status,
                plate: entry.plates,
                brand: entry.brand,
                model: entry.model,
                clientName: entry.user ? `${entry.user.name} ${entry.user.lastName}` : 'Cliente Casual',
                totalCost: total,
                extraCosts: extraCostsSum,
                parkingCost: finalCost
            };
        });

        return res.status(200).json(createTResult(result));

    } catch (error: any) {
        return res.status(500).json(createTResult(null, error.message));
    }
};


import dayjs from "dayjs";
import { 
    generateDebtorsReportPdf, 
    generateFinancialReportPdf, 
    generateInventoryReportPdf, 
    generateOccupancyReportPdf, 
    generateOperatorsReportPdf 
} from "./reports.pdf.service";

export const getFinancialReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json(createTResult(null, ["Dates required"]));
        
        // Use dayjs for robust local/UTC handling
        // startDate comes as 'YYYY-MM-DD'
        const start = dayjs(String(startDate)).startOf('day').toDate();
        const end = dayjs(String(endDate)).endOf('day').toDate();

        const url = await generateFinancialReportPdf(start, end);
        return res.status(200).json(createTResult({ url }));
    } catch (e: any) { return res.status(500).json(createTResult(null, e.message)); }
};

export const getOperatorsReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json(createTResult(null, ["Dates required"]));

        const start = dayjs(String(startDate)).startOf('day').toDate();
        const end = dayjs(String(endDate)).endOf('day').toDate();

        const url = await generateOperatorsReportPdf(start, end);
        return res.status(200).json(createTResult({ url }));
    } catch (e: any) { return res.status(500).json(createTResult(null, e.message)); }
};

export const getInventoryReport = async (req: Request, res: Response) => {
    try {
        const url = await generateInventoryReportPdf();
        return res.status(200).json(createTResult({ url }));
    } catch (e: any) { return res.status(500).json(createTResult(null, e.message)); }
};

export const getOccupancyReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json(createTResult(null, ["Dates required"]));

        const start = dayjs(String(startDate)).startOf('day').toDate();
        const end = dayjs(String(endDate)).endOf('day').toDate();

        const url = await generateOccupancyReportPdf(start, end);
        return res.status(200).json(createTResult({ url }));
    } catch (e: any) { return res.status(500).json(createTResult(null, e.message)); }
};

export const getDebtorsReport = async (req: Request, res: Response) => {
    try {
        const url = await generateDebtorsReportPdf();
        return res.status(200).json(createTResult({ url }));
    } catch (e: any) { return res.status(500).json(createTResult(null, e.message)); }
};

