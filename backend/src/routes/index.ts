import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/users.routes";
import catalogRoutes from "../modules/catalog/catalog.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/catalog", catalogRoutes);

export default router;