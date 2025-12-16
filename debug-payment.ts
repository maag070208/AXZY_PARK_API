import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const debug = async () => {
  const now = new Date();
  console.log("Current Server Time (new Date()):", now.toISOString());
  console.log("Current Server Time (Local string):", now.toString());

  const schedules = await prisma.daySchedule.findMany({
    where: {
        date: {
            gte: new Date("2025-12-15T00:00:00Z"),
            lt: new Date("2025-12-16T00:00:00Z")
        }
    },
    include: {
      coach: true,
      mode: true
    }
  });

  console.log(`Found ${schedules.length} total schedules.`);

  schedules.forEach(s => {
    const isPast = s.endTime < now;
    console.log("------------------------------------------------");
    console.log(`ID: ${s.id}`);
    console.log(`Date: ${s.date.toISOString()}`);
    console.log(`Time: ${s.startTime.toISOString()} - ${s.endTime.toISOString()}`);
    console.log(`Coach: ${s.coach?.name} (ID: ${s.coachId})`);
    console.log(`Mode: ${s.mode.name} (Cost: ${s.mode.coachCost})`);
    console.log(`Is EndTime < Now? ${isPast}`);
    
    // Check our specific payment query conditions
    // Assuming filters.month is 12
    const currentYear = now.getFullYear();
    const currentMonth = 12; // Hardcoded for test
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    const inRange = s.date >= startDate && s.date <= endDate;
    console.log(`In Month Range (${startDate.toISOString()} - ${endDate.toISOString()})? ${inRange}`);
    
    if (s.coachId && inRange && isPast) {
        console.log(">>> SHOULD BE INCLUDED IN PAYMENTS <<<");
    } else {
        console.log(">>> EXCLUDED from Payments <<<");
        if (!s.coachId) console.log("Reason: No Coach");
        else if (!inRange) console.log("Reason: Not in Month Range");
        else if (!isPast) console.log("Reason: Not Completed Yet (endTime >= now)");
    }
  });
};

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
