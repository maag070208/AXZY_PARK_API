import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fix = async () => {
    // 1. Find Coach Carlos
    const coach = await prisma.user.findFirst({ where: { email: "coach1@academy.com" } });
    if (!coach) throw new Error("Coach not found");
    
    console.log(`Assigning schedules to Coach: ${coach.name} (${coach.id})`);

    // 2. Find schedules for 15th Dec with NO coach
    const schedules = await prisma.daySchedule.findMany({
        where: {
            date: {
                gte: new Date("2025-12-15T00:00:00Z"),
                lt: new Date("2025-12-16T00:00:00Z")
            },
            coachId: null
        }
    });

    console.log(`Found ${schedules.length} unassigned schedules today.`);

    // 3. Update them
    for (const schedule of schedules) {
        await prisma.daySchedule.update({
            where: { id: schedule.id },
            data: {
                coachId: coach.id 
            }
        });
        console.log(`Updated schedule ${schedule.id} -> assigned to ${coach.name}`);
    }
    
    console.log("Fix complete.");
};

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
