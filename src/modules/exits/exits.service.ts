import { prismaClient as prisma } from "../../core/config/database";
import { ExitStatus, EntryStatus } from "@prisma/client";

export const getAllExits = async () => {
  return await prisma.vehicleExit.findMany({
    include: {
      entry: {
        include: {
            user: true
        }
      },
      operator: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createExit = async (data: {
  entryId: number;
  operatorUserId: number;
  notes?: string;
}) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Get Entry with VehicleType
    const entry = await tx.vehicleEntry.findUnique({
       where: { id: data.entryId },
       include: { vehicleType: true }
    });
    if (!entry) throw new Error("Entry not found");

    // 2. Determine Cost Rate
    let costRate = 0;
    
    if (entry.vehicleType) {
        costRate = entry.vehicleType.cost;
    } else {
        // Fallback to System Config
        const config = await tx.systemConfig.findUnique({
            where: { key: "PARKING_SETTINGS" }
        });
        costRate = (config?.value as any)?.dayCost || 60;
    }

    // 3. Calculate Cost
    const now = new Date();
    const durationMs = now.getTime() - new Date(entry.entryDate).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    // Logic: Cost per day. If < 24h, counts as 1 day.
    const days = Math.max(1, Math.ceil(durationHours / 24));
    const finalCost = days * costRate;

    // 4. Create Exit with Cost
    const exit = await tx.vehicleExit.create({
      data: {
        entryId: data.entryId,
        operatorUserId: data.operatorUserId,
        status: ExitStatus.DELIVERED,
        notes: data.notes,
        finalCost: finalCost
      },
    });

    // 5. Update Entry Status
    await tx.vehicleEntry.update({
      where: { id: data.entryId },
      data: {
        status: EntryStatus.EXITED,
      },
    });

    // 6. Free Location
    await tx.location.update({
        where: { id: entry.locationId },
        data: { isOccupied: false }
    });

    return exit;
  });
};
