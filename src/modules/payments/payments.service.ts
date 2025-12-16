import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCoachPayments = async (filters: { startDate: Date; endDate: Date; coachId?: number }) => {
  const { startDate, endDate, coachId } = filters;

  // Completed schedules only (date within range AND endTime < now)
  const schedules = await prisma.daySchedule.findMany({
    where: {
      coachId: coachId ? coachId : { not: null },
      date: {
        gte: startDate,
        lte: endDate,
      },
      // Ensure it is in the past to be "completed"
      endTime: {
        lt: new Date()
      }
    },
    include: {
      coach: true,
      mode: true
    }
  });

  // Group by Coach
  const paymentsMap = new Map<number, {
    coachId: number;
    coachName: string;
    completedClasses: number;
    totalAmount: number;
    details: any[];
  }>();

  schedules.forEach(schedule => {
    if (!schedule.coachId || !schedule.coach) return;

    const coachId = schedule.coachId;
    if (!paymentsMap.has(coachId)) {
        paymentsMap.set(coachId, {
            coachId,
            coachName: `${schedule.coach.name} ${schedule.coach.lastName || ''}`,
            completedClasses: 0,
            totalAmount: 0,
            details: []
        });
    }

    const entry = paymentsMap.get(coachId)!;
    entry.completedClasses += 1;
    // Cost comes from TrainingMode
    const cost = schedule.mode.coachCost || 0;
    entry.totalAmount += cost;
    entry.details.push({
        date: schedule.date,
        mode: schedule.mode.name,
        cost
    });
  });

  return Array.from(paymentsMap.values());
};
