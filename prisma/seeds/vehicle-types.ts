import { PrismaClient } from "@prisma/client";

export const vehicleTypesSeed = async (prisma: PrismaClient) => {
  const types = [
    { name: "Sedan", cost: 60 },
    { name: "SUV", cost: 80 },
    { name: "Pickup", cost: 100 },
  ];

  for (const t of types) {
    await prisma.vehicleType.upsert({
      where: { name: t.name },
      update: { cost: t.cost },
      create: t,
    });
  }
};
