import { PrismaClient } from "@prisma/client";

export const locationsSeed = async (prisma: PrismaClient) => {
  const locations = [
    { name: "A", aisle: "A", spot: "1" },
    { name: "B", aisle: "B", spot: "1" },
    { name: "C", aisle: "C", spot: "1" },
    { name: "D", aisle: "D", spot: "1" },
  ];

  for (const location of locations) {
    const exists = await prisma.location.findFirst({
      where: { name: location.name },
    });

    if (!exists) {
      await prisma.location.create({
        data: {
          ...location,
          isOccupied: false,
        },
      });
    }
  }
};
