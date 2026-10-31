import express
    from "express";

import {
    createOrderController,
    getMyOrdersController,
     getAdminOrdersController,
     createManualOrder,
     createQuotationOrderController ,
     cancelStoreOrderController,
     updateStoreOrderStatusController,
     retryShipmentFulfilmentController,
     schedulePickupController
} from "../controllers/order.controller.js";
import { protect ,authorize} from "../middlewares/auth.middleware.js";


const router =
    express.Router();


router.post(
    "/",
    protect,
    authorize("user"),
    createOrderController
);


router.get(
    "/my-orders",
    protect,
    getMyOrdersController
);

router.get(
    "/admin",
    protect,
    authorize("admin"),
    getAdminOrdersController
);

router.patch(
    "/:id/cancel",
    protect,
    authorize("user"),
    cancelStoreOrderController
);

router.patch(
    "/:id/status",
    protect,
    authorize("admin"),
    updateStoreOrderStatusController
);


router.post("/manual",protect,authorize("staff","admin"),createManualOrder)

router.post(
    "/quotation/:quotationId",
    protect,
    authorize("user"),
    createQuotationOrderController
);

// Admin: re-run Shiprocket fulfilment for an order whose automatic
// post-payment attempt failed. Idempotent on the service side — if the
// order was already synced, it short-circuits.
router.post(
    "/:id/shipment/retry",
    protect,
    authorize("admin"),
    retryShipmentFulfilmentController
);

// Admin: schedule the courier pickup for an order that already has an
// assigned AWB.
router.post(
    "/:id/shipment/pickup",
    protect,
    authorize("admin"),
    schedulePickupController
);


export default router;