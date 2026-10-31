import Order from "../models/order.model.js";
import OrderItem from "../models/orderItem.model.js";
import Notification from "../models/notification.model.js";
import { io } from "../config/socket.js";

import {
    createShiprocketOrder,
    assignAWBToShipment,
    requestShiprocketPickup
} from "./shiprocket.service.js";


// Known Shiprocket shipment status strings mapped onto our internal
// Order.status enum. Anything not listed here keeps the order where it
// is, with only the raw `shipping.lastShipmentStatus` updated — safer
// than guessing. Case-insensitive match in the apply function below.
const SHIPROCKET_STATUS_MAP = {
    "NEW": "CONFIRMED",
    "AWB ASSIGNED": "CONFIRMED",
    "AWB_ASSIGNED": "CONFIRMED",
    "LABEL GENERATED": "CONFIRMED",
    "LABEL_GENERATED": "CONFIRMED",
    "PICKUP SCHEDULED": "CONFIRMED",
    "PICKUP_SCHEDULED": "CONFIRMED",
    "PICKUP QUEUED": "CONFIRMED",
    "PICKUP_QUEUED": "CONFIRMED",

    "MANIFESTED": "PROCESSING",
    "PICKED UP": "PROCESSING",
    "PICKED_UP": "PROCESSING",
    "SHIPPED": "PROCESSING",
    "IN TRANSIT": "PROCESSING",
    "IN_TRANSIT": "PROCESSING",
    "REACHED DESTINATION HUB": "PROCESSING",
    "OUT FOR DELIVERY": "PROCESSING",
    "OUT_FOR_DELIVERY": "PROCESSING",

    "DELIVERED": "COMPLETED",

    "CANCELLED": "CANCELLED",
    "RTO INITIATED": "CANCELLED",
    "RTO_INITIATED": "CANCELLED",
    "RTO DELIVERED": "CANCELLED",
    "RTO_DELIVERED": "CANCELLED",
    "LOST": "CANCELLED",
    "PICKUP ERROR": "CANCELLED",
    "PICKUP_ERROR": "CANCELLED",
    "DELIVERY FAILED": "CANCELLED",
    "DELIVERY_FAILED": "CANCELLED"
};


// Status progression — a webhook may never silently roll an order
// backwards (e.g. admin set IN_PRODUCTION while Shiprocket still shows
// PICKUP_SCHEDULED → we don't want to downgrade to CONFIRMED).
// CANCELLED is terminal and allowed from any state.
const STATUS_RANK = {
    PENDING_PAYMENT: 0,
    PAID: 1,
    CONFIRMED: 2,
    PROCESSING: 3,
    IN_PRODUCTION: 4,
    COMPLETED: 5,
    CANCELLED: 6
};


const customerFacingMessage = (statusRaw) => {
    const s = String(statusRaw || "").toLowerCase();
    if (s.includes("delivered") && !s.includes("rto")) {
        return "Your order has been delivered.";
    }
    if (s.includes("out for delivery")) {
        return "Your order is out for delivery today.";
    }
    if (s.includes("in transit") || s === "shipped") {
        return "Your order is on its way.";
    }
    if (s.includes("picked up")) {
        return "Your order has been picked up by the courier.";
    }
    if (s.includes("rto")) {
        return "Your order could not be delivered and is being returned.";
    }
    if (s.includes("cancelled")) {
        return "Your shipment has been cancelled.";
    }
    return `Shipment update: ${statusRaw}`;
};


const buildTrackingUrl = (awbCode) =>
    awbCode
        ? `https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}`
        : null;


/**
 * Post-payment Shiprocket fulfilment: creates the Shiprocket order,
 * assigns the AWB with the courier the shopper picked at checkout,
 * and writes the resulting handles onto the order. Any failure is
 * recorded on `order.shipping.error` for admin follow-up — this
 * function must never throw up to the payment-verification caller
 * (payment is already captured by the time we're invoked).
 */
export const fulfilOrderWithShiprocket = async (orderId) => {

    const order = await Order.findById(orderId).populate(
        "user",
        "name email phone"
    );

    if (!order) {
        return {
            ok: false,
            reason: "Order not found"
        };
    }

    // Already synced — don't double-create. Safe to re-run otherwise.
    if (order.shipping?.shiprocketOrderId && order.shipping?.awbCode) {
        return { ok: true, order };
    }

    const items = await OrderItem.find({ order: order._id }).lean();

    try {
        // 1. Create the Shiprocket order (if not already created).
        let shiprocketOrderId = order.shipping?.shiprocketOrderId;
        let shipmentId = order.shipping?.shipmentId;

        if (!shiprocketOrderId || !shipmentId) {
            const created = await createShiprocketOrder(order, items);
            shiprocketOrderId = created.shiprocketOrderId;
            shipmentId = created.shipmentId;

            order.shipping.shiprocketOrderId = shiprocketOrderId;
            order.shipping.shipmentId = shipmentId;
            await order.save();
        }

        // 2. Assign the AWB using the courier the shopper picked at
        //    checkout. Shiprocket may fall back to a different courier
        //    if the chosen one is no longer serviceable — we trust its
        //    response and overwrite courierName accordingly.
        const awb = await assignAWBToShipment(
            shipmentId,
            order.shipping.courierId
        );

        order.shipping.awbCode = awb.awbCode;
        if (awb.courierName) {
            order.shipping.courierName = awb.courierName;
        }
        if (awb.labelUrl) order.shipping.labelUrl = awb.labelUrl;
        if (awb.invoiceUrl) order.shipping.invoiceUrl = awb.invoiceUrl;
        order.shipping.trackingUrl = buildTrackingUrl(awb.awbCode);

        order.shipping.syncedAt = new Date();
        order.shipping.error = null;

        await order.save();

        return { ok: true, order };
    } catch (error) {
        order.shipping.error =
            error?.message || "Shiprocket fulfilment failed";
        await order.save();

        console.error(
            `[shipment] Shiprocket fulfilment failed for order ${order._id}:`,
            error?.message || error
        );

        return {
            ok: false,
            reason: order.shipping.error,
            order
        };
    }
};


/**
 * Admin-triggered pickup request. Separate from fulfilment because the
 * pickup is usually scheduled when staff physically has the parcel
 * ready, not the moment payment lands.
 */
export const schedulePickupForOrder = async (orderId) => {

    const order = await Order.findById(orderId);

    if (!order) {
        const error = new Error("Order not found");
        error.status = 404;
        throw error;
    }

    if (!order.shipping?.shipmentId) {
        const error = new Error(
            "This order has no Shiprocket shipment yet — assign an AWB first."
        );
        error.status = 400;
        throw error;
    }

    const result = await requestShiprocketPickup(
        order.shipping.shipmentId
    );

    order.shipping.pickupStatus = result.pickupStatus;
    if (result.pickupScheduledFor) {
        order.shipping.pickupScheduledFor = new Date(
            result.pickupScheduledFor
        );
    }
    order.shipping.syncedAt = new Date();

    await order.save();

    return {
        pickupStatus: order.shipping.pickupStatus,
        pickupScheduledFor: order.shipping.pickupScheduledFor
    };
};


/**
 * Apply a Shiprocket shipment-status webhook payload to the matching
 * order. Resilient on purpose: a webhook retry is cheaper than a lost
 * one, so we are idempotent (no-op when the status already matches)
 * and never raise unless we literally cannot find the order.
 *
 * Shiprocket's `channel_order_id` is the string we sent as `order_id`
 * when creating the shipment — i.e. our Order._id. If that lookup
 * misses (older orders, stray webhooks), fall back to AWB or their
 * internal order id.
 */
export const applyShiprocketWebhook = async (payload = {}) => {

    const channelOrderId = payload.channel_order_id || payload.channelOrderId;
    const awb = payload.awb || payload.awb_code;
    const shiprocketOrderId =
        payload.order_id != null ? String(payload.order_id) : null;

    const statusRaw =
        payload.current_status ||
        payload.shipment_status ||
        payload.status ||
        "";

    const statusKey = String(statusRaw).trim().toUpperCase();
    const mapped = SHIPROCKET_STATUS_MAP[statusKey] || null;

    // Try the three identifiers in order of specificity.
    let order = null;
    if (channelOrderId) {
        order = await Order.findById(channelOrderId).catch(() => null);
    }
    if (!order && awb) {
        order = await Order.findOne({ "shipping.awbCode": String(awb) });
    }
    if (!order && shiprocketOrderId) {
        order = await Order.findOne({
            "shipping.shiprocketOrderId": shiprocketOrderId
        });
    }

    if (!order) {
        return {
            ok: false,
            reason: "No matching order for webhook payload"
        };
    }

    // Idempotency — Shiprocket will retry on 5xx and sometimes on 2xx
    // too. If the raw status already matches, there's nothing to do.
    if (
        order.shipping?.lastShipmentStatus &&
        order.shipping.lastShipmentStatus.toUpperCase() === statusKey
    ) {
        return { ok: true, order, skipped: "duplicate" };
    }

    order.shipping.lastShipmentStatus = statusRaw;
    order.shipping.lastShipmentStatusAt = new Date();
    order.shipping.syncedAt = new Date();

    // Shiprocket occasionally pushes an updated ETD on the webhook —
    // propagate it so the admin + customer views stay in sync.
    if (payload.etd) {
        const parsed = new Date(payload.etd);
        if (!Number.isNaN(parsed.getTime())) {
            order.shipping.estimatedDelivery = parsed;
        }
    }

    // Promote the Order.status only when the mapped target is at least
    // as advanced as the current one — admin-set states like
    // IN_PRODUCTION are preserved. CANCELLED is terminal and always
    // allowed to overwrite.
    if (mapped) {
        const currentRank = STATUS_RANK[order.status] ?? 0;
        const nextRank = STATUS_RANK[mapped] ?? 0;
        if (mapped === "CANCELLED" || nextRank >= currentRank) {
            order.status = mapped;
        }
    }

    await order.save();

    // Fire a customer-facing notification for the states the shopper
    // actually cares about. We intentionally skip the chatter around
    // AWB_ASSIGNED / LABEL_GENERATED so inboxes don't drown.
    const notifyOn = new Set([
        "PICKED UP",
        "PICKED_UP",
        "SHIPPED",
        "IN TRANSIT",
        "IN_TRANSIT",
        "OUT FOR DELIVERY",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "RTO INITIATED",
        "RTO_INITIATED",
        "CANCELLED"
    ]);
    if (notifyOn.has(statusKey) && order.user) {
        try {
            const notification = await Notification.create({
                recipient: order.user,
                type: "ORDER_SHIPMENT_UPDATE",
                message: customerFacingMessage(statusRaw),
                referenceId: order._id,
                isRead: false
            });
            io.to(String(order.user)).emit(
                "new_notification",
                notification
            );
        } catch (error) {
            console.warn(
                `[shipment] notification failed for order ${order._id}:`,
                error?.message || error
            );
        }
    }

    return { ok: true, order };
};
