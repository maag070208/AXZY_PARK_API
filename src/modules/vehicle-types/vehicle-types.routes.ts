import { Router } from "express";
import { create, getAll, remove, update } from "./vehicle-types.controller";

const router = Router();

router.get("/", getAll);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
