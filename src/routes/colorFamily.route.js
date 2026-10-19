import express from "express";
import {
    listColorFamilies,
    createColorFamily,
    updateColorFamily,
    deleteColorFamily
} from "../controllers/colorFamily.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public read — the storefront may group colors by family later.
router.get("/", listColorFamilies);

// Admin-only writes.
router.post("/", protect, authorize("admin"), createColorFamily);
router.put("/:id", protect, authorize("admin"), updateColorFamily);
router.delete("/:id", protect, authorize("admin"), deleteColorFamily);

export default router;
