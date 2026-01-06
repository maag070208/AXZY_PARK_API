import { prismaClient } from "@src/core/config/database";

export const getVehicleTypes = async () => {
  return prismaClient.vehicleType.findMany({
    orderBy: { cost: 'asc' }
  });
};

export const createVehicleType = async (data: { name: string; cost: number }) => {
  return prismaClient.vehicleType.create({
    data
  });
};

export const updateVehicleType = async (id: number, data: { name?: string; cost?: number }) => {
  return prismaClient.vehicleType.update({
    where: { id },
    data
  });
};

export const deleteVehicleType = async (id: number) => {
  return prismaClient.vehicleType.delete({
    where: { id }
  });
};
