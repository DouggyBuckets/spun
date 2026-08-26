import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/users.routes";
import catalogRoutes from "../modules/catalog/catalog.routes";
import ratingRoutes from "../modules/ratings/ratings.routes";
import reviewRoutes from "../modules/reviews/reviews.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/catalog", catalogRoutes);
router.use("/ratings", ratingRoutes);
router.use("/reviews", reviewRoutes);

export default router;