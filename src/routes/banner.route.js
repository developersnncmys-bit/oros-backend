import express from "express";
const router = express.Router();
import {
    createBanner,
    getBanners,
    updateBannerById,
    deleteBannerById,
    getBannerUploadSignature
} from "../controllers/banner.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

// Public: the home page reads its slider and showreel from here.
// ?type=SLIDER|SHOWREEL narrows it; ?isActive=true hides the ones taken down.
router.get("/", getBanners);

// Admin: hand back a signed Cloudinary upload request. The browser then
// POSTs the file directly to Cloudinary so the banner media never
// crosses our serverless function (Vercel caps request bodies at 4.5 MB).
router.get(
    "/upload-signature",
    protect,
    authorize("admin"),
    getBannerUploadSignature
);

// Banner create/update now receive JSON only — the media URLs and
// publicIds come in already-uploaded, via the signed Cloudinary flow.
router.post("/", protect, authorize("admin"), createBanner);

router.put("/:id", protect, authorize("admin"), updateBannerById);

router.delete("/:id", protect, authorize("admin"), deleteBannerById);

export default router
