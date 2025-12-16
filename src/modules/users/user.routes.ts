import Router from "express";
import { createUser, getAllUsers, login, getCoachesList } from "./user.controller";

const router = Router();

router.get("/", getAllUsers);
router.get("/coaches", getCoachesList);
router.post("/login", login);
router.post("/", createUser);

export default router;
