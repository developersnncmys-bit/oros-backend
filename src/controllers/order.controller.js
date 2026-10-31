import {
    createOrderService,
    getMyOrdersService,
    getAdminOrdersService,
    createManualOrderService,
        createQuotationOrderService,
        cancelStoreOrderService,
        updateStoreOrderStatusService

} from "../services/order.service.js";

import {
    fulfilOrderWithShiprocket,
    schedulePickupForOrder
} from "../services/shipment.service.js";


export const createOrderController =
    async (
        req,
        res
    ) => {

        const result =
            await createOrderService(
                req.user.id,
                req.body
            );

        return res
            .status(201)
            .json(result);
    };


export const getMyOrdersController = async (
    req,
    res
) => {

    const result =
        await getMyOrdersService(
            req.user.id,
            req.query.page,
            req.query.limit
        );

    return res
        .status(200)
        .json(result);
};

export const getAdminOrdersController = async (req, res) => {

    const result = await getAdminOrdersService(
        req.query.userId,
        req.query.source,
        req.query.paymentStatus,
        req.query.status,
        req.query.page,
        req.query.limit
    );

    return res
        .status(200)
        .json(result);
};


export const createManualOrder = async (req, res) => {
    const { message, data } = await createManualOrderService(req.body, req.user);
    res.json({
        message,
        success: true,
        data
    })
}

export const createQuotationOrderController =
    async (req, res) => {

        const {
            quotationId
        } = req.params;

        const result =
            await createQuotationOrderService(
                req.user.id,
                quotationId
            );

        res.status(201).json({
            success: true,
            ...result
        });
    };

    export const cancelStoreOrderController =
    async (req, res) => {

        const {
            id
        } = req.params;

        const result =
            await cancelStoreOrderService(
                id,
                req.user.id
            );

        return res
            .status(200)
            .json({
                success: true,
                ...result
            });
    };


// ==========================================
// ADMIN UPDATE STORE ORDER STATUS
// ==========================================

export const updateStoreOrderStatusController =
    async (req, res) => {

        const {
            id
        } = req.params;

        const {
            status
        } = req.body;

        const result =
            await updateStoreOrderStatusService(
                id,
                status
            );

        return res
            .status(200)
            .json({
                success: true,
                ...result
            });
    };


// ==========================================
// ADMIN: Retry Shiprocket fulfilment
// Used when the automatic post-payment fulfilment left an error on
// order.shipping.error (e.g. courier briefly out of service) and the
// admin wants to try again without re-triggering payment.
// ==========================================

export const retryShipmentFulfilmentController =
    async (req, res, next) => {
        try {
            const result =
                await fulfilOrderWithShiprocket(req.params.id);

            if (!result.ok) {
                return res.status(502).json({
                    success: false,
                    message:
                        result.reason ||
                        "Shiprocket fulfilment failed",
                    data: {
                        order: result.order || null
                    }
                });
            }

            return res.status(200).json({
                success: true,
                message: "Shiprocket fulfilment succeeded",
                data: {
                    order: result.order
                }
            });
        } catch (error) {
            next(error);
        }
    };


// ==========================================
// ADMIN: Request Shiprocket pickup
// Separate from AWB assignment — admin triggers this when the parcel
// is physically ready to be handed over to the courier.
// ==========================================

export const schedulePickupController =
    async (req, res, next) => {
        try {
            const result =
                await schedulePickupForOrder(req.params.id);

            return res.status(200).json({
                success: true,
                message: "Pickup scheduled with Shiprocket",
                data: result
            });
        } catch (error) {
            next(error);
        }
    };