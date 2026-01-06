import { PrismaClient } from "@prisma/client";

export const configSeed = async (prisma: PrismaClient) => {
  const CONFIG_KEY = "PARKING_SETTINGS";
  const defaultConfig = {
    maxCapacity: 100,
  };

  const existing = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEY },
  });

  if (existing) {
    // Merge or Update specific fields
    const currentVal = existing.value as any;
    await prisma.systemConfig.update({
      where: { key: CONFIG_KEY },
      data: {
        value: {
          ...currentVal,
          maxCapacity: 100, // Enforce 100 as requested
        },
      },
    });
  } else {
    await prisma.systemConfig.create({
      data: {
        key: CONFIG_KEY,
        value: defaultConfig,
      },
    });
  }
};
