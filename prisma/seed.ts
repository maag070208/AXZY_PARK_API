import { PrismaClient } from "@prisma/client";
import { securitySeed } from "./seeds/security";

import { vehicleTypesSeed } from "./seeds/vehicle-types";
import { configSeed } from "./seeds/config";
import { locationsSeed } from "./seeds/locations";

const prisma = new PrismaClient();

async function main() {
  await securitySeed(prisma);
  await vehicleTypesSeed(prisma);
  await configSeed(prisma);
  await locationsSeed(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
