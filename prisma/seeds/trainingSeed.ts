import { PrismaClient } from "@prisma/client";

export const trainingSeed = async (prisma: PrismaClient) => {
  await trainingModeSeed(prisma);
  await scheduleSeed(prisma);
  await appointmentSeed(prisma);
};

// ---------------------------
//  SEED: TRAINING MODES
// ---------------------------
const trainingModeSeed = async (prisma: PrismaClient) => {
  const modes = [
    { name: "Bateo", description: "Entrenamiento de bateo", coachCost: 50 },
    {
      name: "Pitcher",
      description: "Entrenamiento especializado para pitchers",
      coachCost: 100,
    },
    {
      name: "Catcher",
      description: "Entrenamiento especializado para catchers",
      coachCost: 100,
    },
    {
      name: "Funcional",
      description: "Entrenamiento funcional y físico",
      coachCost: 50,
    },
    { name: "General", description: "Entrenamiento general", coachCost: 50 },
  ];

  for (const mode of modes) {
    await prisma.trainingMode.upsert({
      where: { name: mode.name },
      update: { coachCost: mode.coachCost },
      create: mode,
    });
  }
};

// ---------------------------
//  SEED: SCHEDULES
// ---------------------------
const scheduleSeed = async (prisma: PrismaClient) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

  const modes = await prisma.trainingMode.findMany();
  const getModeId = (name: string) =>
    modes.find((m) => m.name === name)?.id || 1;

  const coaches = await prisma.user.findMany({ where: { role: "COACH" } });
  const coach1 = coaches.find((c) => c.email === "coach1@academy.com");
  const coach2 = coaches.find((c) => c.email === "coach2@academy.com");

  if (!coach1 || !coach2) {
    console.warn("Coaches not found, skipping schedule assignment");
    return;
  }

  const schedules = [
    // --- PAST SCHEDULES (Completed -> For Payments) ---
    {
      date: pastDate,
      startTime: buildTime(pastDate, 16, 0),
      endTime: buildTime(pastDate, 17, 0),
      capacity: 10,
      modeId: getModeId("Bateo"),
      coachId: coach1.id, // Coach 1 earned 50
    },
    {
      date: pastDate,
      startTime: buildTime(pastDate, 17, 0),
      endTime: buildTime(pastDate, 18, 0),
      capacity: 10,
      modeId: getModeId("Pitcher"),
      coachId: coach1.id, // Coach 1 earned 100
    },
    {
      date: pastDate,
      startTime: buildTime(pastDate, 16, 0),
      endTime: buildTime(pastDate, 17, 0),
      capacity: 10,
      modeId: getModeId("Catcher"),
      coachId: coach2.id, // Coach 2 earned 100 (Concurrent with Coach 1)
    },

    // --- FUTURE SCHEDULES (For Booking) ---
    {
      date: tomorrow,
      startTime: buildTime(tomorrow, 16, 0),
      endTime: buildTime(tomorrow, 17, 0),
      capacity: 10,
      modeId: getModeId("General"),
      coachId: coach1.id,
    },
    {
      date: tomorrow,
      startTime: buildTime(tomorrow, 17, 0),
      endTime: buildTime(tomorrow, 18, 0),
      capacity: 10,
      modeId: getModeId("General"),
      coachId: coach2.id,
    },
    {
      date: tomorrow,
      startTime: buildTime(tomorrow, 18, 0),
      endTime: buildTime(tomorrow, 19, 0),
      capacity: 5,
      modeId: getModeId("Bateo"),
      coachId: null, // No coach assigned yet
    },
  ];

  console.log(`Seeding ${schedules.length} schedules...`);

  for (const s of schedules) {
    // Unique constraint: [date, startTime, endTime, coachId, modeId]
    const exists = await prisma.daySchedule.findFirst({
      where: {
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        coachId: s.coachId,
        modeId: s.modeId,
      },
    });

    if (!exists) {
        await prisma.daySchedule.create({
            data: s
        })
    }
  }
};

// ---------------------------
//  SEED: APPOINTMENTS
// ---------------------------
const appointmentSeed = async (prisma: PrismaClient) => {
    // 1. Get Children
    const children = await prisma.child.findMany();
    if (children.length === 0) return;

    // 2. Get Past Schedules (to simulate completed classes)
    const pastSchedules = await prisma.daySchedule.findMany({
        where: {
            endTime: { lt: new Date() },
            coachId: { not: null } // Only if coach assigned
        }
    });

    // 3. Assign random children to past schedules
    for (const schedule of pastSchedules) {
        // Assign first child
        if(children[0]) {
             await createAppointmentIfNotExists(prisma, children[0].userId, children[0].id, schedule.id, schedule.modeId);
        }
    }
}

const createAppointmentIfNotExists = async (prisma: PrismaClient, userId: number, childId: number, scheduleId: number, modeId: number) => {
    const exists = await prisma.appointment.findFirst({
        where: {
            childId,
            scheduleId
        }
    });

    if(!exists) {
        await prisma.appointment.create({
            data: {
                userId,
                childId,
                scheduleId,
                modeId
            }
        });
    }
}

const buildTime = (baseDate: Date, h: number, m: number) => {
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
};
