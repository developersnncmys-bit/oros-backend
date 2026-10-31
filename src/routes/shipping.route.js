import express from "express";

import {
    prepareShippingController,
    getShippingRatesController,
    shiprocketWebhookController
} from "../controllers/shipping.controller.js";

import {
    protect
} from "../middlewares/auth.middleware.js";


const router = express.Router();


// Shiprocket webhook — public endpoint, auth is a shared token in a
// header verified inside the controller. Must be registered BEFORE the
// `protect` middleware below so Shiprocket's unauthenticated POSTs
// reach it instead of getting rejected.
router.post(
    "/webhook/shiprocket",
    shiprocketWebhookController
);


router.use(protect);


router.get(
    "/prepare",
    prepareShippingController
);

router.post(
    "/rates",
    getShippingRatesController
);
export default router;