import express from "express";
import {
    listFilaments,
    createFilament,
    updateFilament,
    deleteFilament,
    addColor,
    updateColor,
    deleteColor
} from "../controllers/filament.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public read — the storefront needs to render filament/color pickers.
router.get("/", listFilaments);

// Admin-only writes.
router.post("/", protect, authorize("admin"), createFilament);
router.put("/:id", protect, authorize("admin"), updateFilament);
router.delete("/:id", protect, authorize("admin"), deleteFilament);

router.post("/:id/colors", protect, authorize("admin"), addColor);
router.put("/colors/:colorId", protect, authorize("admin"), updateColor);
router.delete("/colors/:colorId", protect, authorize("admin"), deleteColor);

export default router;
