// src/routes/personalisation.route.js

import express from "express";

import { protect, authorize } from "../middlewares/auth.middleware.js";
import { personalisationLogoUpload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(protect);

router.post(
    "/logo",
    authorize("user"),
    personalisationLogoUpload.single("logo"),
    (req, res, next) => {
        try {
            if (!req.file) {
                const error = new Error("Logo file is required");
                error.status = 400;
                throw error;
            }

            return res.status(201).json({
                url: req.file.path,
                publicId: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
