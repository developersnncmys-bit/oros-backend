import {
    prepareShippingService,getShippingRatesService
} from "../services/shipping.service.js";

import { applyShiprocketWebhook } from "../services/shipment.service.js";


export const prepareShippingController =
    async (req, res) => {

        const result =
            await prepareShippingService(
                req.user.id,
                req.body?.addressId || req.query?.addressId
            );

        return res
            .status(200)
            .json({
                message:
                    "Shipping data prepared successfully",

                data: result
            });
    };

    export const getShippingRatesController =
    async (req, res) => {

        const result =
            await getShippingRatesService(
                req.user.id,
                req.body
            );

        return res
            .status(200)
            .json({
                message:
                    "Shipping rates fetched successfully",

                data: result
            });
    };


/**
 * Public webhook called by Shiprocket on every shipment status change.
 * Verified via a shared secret you configure in the Shiprocket dashboard
 * — set the SAME value in SHIPROCKET_WEBHOOK_TOKEN on this server.
 *
 * Always responds 200 on an accepted or duplicate event so Shiprocket's
 * retry queue stays quiet; a 401 only comes out when the shared secret
 * is wrong or missing, which signals a misconfiguration (not a transient
 * issue Shiprocket should retry around).
 */
export const shiprocketWebhookController = async (req, res) => {

    const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    const supplied =
        req.headers["x-api-key"] ||
        req.headers["x-shiprocket-token"] ||
        req.body?.token;

    if (expected) {
        if (!supplied || String(supplied) !== String(expected)) {
            return res.status(401).json({
                message: "Invalid webhook token"
            });
        }
    } else {
        // Loud warning instead of silent accept — prod should always set
        // this, dev can run without it but gets reminded on every call.
        console.warn(
            "[shiprocket webhook] SHIPROCKET_WEBHOOK_TOKEN is not set — accepting unverified payloads. Do not run this way in production."
        );
    }

    try {
        const result = await applyShiprocketWebhook(req.body || {});
        if (!result.ok) {
            console.warn(
                "[shiprocket webhook]",
                result.reason,
                "— payload:",
                JSON.stringify(req.body).slice(0, 500)
            );
        }
        // Always 200 for accepted-or-unmatched events; a 4xx/5xx would
        // make Shiprocket retry a payload we can't do anything with.
        return res.status(200).json({ received: true });
    } catch (error) {
        console.error(
            "[shiprocket webhook] unhandled error:",
            error?.message || error
        );
        return res.status(200).json({ received: true });
    }
};