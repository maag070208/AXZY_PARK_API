import { Request, Response } from "express";
import { prismaClient as prisma } from "../../core/config/database";
import { createTResult } from "@src/core/mappers/tresult.mapper";

const CONFIG_KEY = "PARKING_SETTINGS";

export const getSystemConfig = async (req: Request, res: Response) => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    // Default configuration if not found
    const result = {
        maxCapacity: (config?.value as any)?.maxCapacity || 100,
        dayCost: (config?.value as any)?.dayCost || 60,
    };

    return res.status(200).json(createTResult(result));
  } catch (error: any) {
    return res.status(500).json(createTResult(null, error.message));
  }
};

export const updateSystemConfig = async (req: Request, res: Response) => {
  try {
    const { maxCapacity, dayCost } = req.body;

    // Fetch existing logic to merge? Or simple overwrite? 
    // Upsert replaces fields in 'value' JSON if we just pass new object.
    // Better to merge if we wanted to be safe, but for now specific explicit fields.
    // Actually, prisma update on Json replaces the object unless we do deep merge manually.
    // I will read existing first if I wanted to merge, but here I can just expect both or use defaults.
    
    // Simpler: Just accept payload. 
    // Wait, if user updates only maxCapacity, dayCost might be lost if I don't handle it.
    
    const existing = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    const prevValue = (existing?.value as any) || { maxCapacity: 100, dayCost: 60 };
    
    const newValue = {
        maxCapacity: maxCapacity ? Number(maxCapacity) : prevValue.maxCapacity,
        dayCost: dayCost ? Number(dayCost) : prevValue.dayCost,
    };

    const config = await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: {
        value: newValue,
      },
      create: {
        key: CONFIG_KEY,
        value: newValue,
      },
    });

    return res.status(200).json(createTResult(config.value));
  } catch (error: any) {
    return res.status(500).json(createTResult(null, error.message));
  }
};
