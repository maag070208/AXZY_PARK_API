import { prismaClient as prisma } from "../../core/config/database";

export const getFinancialData = async (startDate: Date, endDate: Date) => {
    // Get all exits and extra costs in range
    const exits = await prisma.vehicleExit.findMany({
        where: {
            exitDate: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            operator: true,
            entry: {
                include: {
                    user: true,
                    operator: true,
                    vehicleType: true,
                    extraCosts: true
                }
            }
        }
    });

    const extraCosts = await prisma.extraCost.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            entry: true
        }
    });

    return { exits, extraCosts };
};

export const getOperatorsData = async (startDate: Date, endDate: Date) => {
    // 1. Entries created by operator
    const entries = await prisma.vehicleEntry.findMany({
        where: {
            entryDate: {
                gte: startDate,
                lte: endDate
            }
        },
        include: { operator: true }
    });

    // 2. Exits processed by operator (payments)
    const exits = await prisma.vehicleExit.findMany({
        where: {
            exitDate: {
                gte: startDate,
                lte: endDate
            }
        },
        include: { operator: true }
    });

    return { entries, exits };
};

export const getInventoryData = async () => {
    // Current active inventory (ignore dates usually, or snapshot?)
    // Report usually wants "Current Status"
    return await prisma.vehicleEntry.findMany({
        where: {
            status: { in: ['ACTIVE', 'MOVED'] }
        },
        include: {
            user: true,
            vehicleType: true
        },
        orderBy: {
            entryDate: 'asc'
        }
    });
};

export const getOccupancyData = async (startDate: Date, endDate: Date) => {
    const entries = await prisma.vehicleEntry.findMany({
        where: {
            entryDate: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    const exits = await prisma.vehicleExit.findMany({
        where: {
            exitDate: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    return { entries, exits };
};

export const getDebtorsData = async () => {
    // High debt = Longest stay
    return await prisma.vehicleEntry.findMany({
        where: {
            status: { in: ['ACTIVE', 'MOVED'] }
        },
        include: {
            user: true,
            extraCosts: true,
            vehicleType: true
        },
        orderBy: {
            entryDate: 'asc'
        }
    });
};
