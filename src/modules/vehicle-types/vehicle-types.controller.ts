import { Request, Response } from "express";
import { createTResult } from "@src/core/mappers/tresult.mapper";
import { createVehicleType, deleteVehicleType, getVehicleTypes, updateVehicleType } from "./vehicle-types.service";

export const getAll = async (req: Request, res: Response) => {
  try {
    const types = await getVehicleTypes();
    return res.status(200).json(createTResult(types));
  } catch (error: any) {
    return res.status(500).json(createTResult(null, error.message));
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { name, cost } = req.body;
    if (!name || cost === undefined) {
      return res.status(400).json(createTResult(null, ["Name and Cost are required"]));
    }
    const type = await createVehicleType({ name, cost: Number(cost) });
    return res.status(201).json(createTResult(type));
  } catch (error: any) {
    return res.status(500).json(createTResult(null, error.message));
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, cost } = req.body;
    const type = await updateVehicleType(Number(id), { name, cost: cost !== undefined ? Number(cost) : undefined });
    return res.status(200).json(createTResult(type));
  } catch (error: any) {
    return res.status(500).json(createTResult(null, error.message));
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteVehicleType(Number(id));
    return res.status(200).json(createTResult(true));
  } catch (error: any) {
    return res.status(500).json(createTResult(null, error.message));
  }
};
