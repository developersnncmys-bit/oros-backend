import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {


        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        source: {
            type: String,
            enum: [
                "STORE",
                "QUOTATION",
                "MANUAL"
            ],
            default: "STORE"
        },

        quotation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quotation",
            default: null
        },

        status: {
            type: String,
            enum: [
                "PENDING_PAYMENT",
                "PAID",
                "CONFIRMED",
                "PROCESSING",
                "IN_PRODUCTION",
                "COMPLETED",
                "CANCELLED"
            ],
            default: "PENDING_PAYMENT"
        },

        pricing: {
            subtotal: {
                type: Number,
                required: true,
                min: 0
            },

            shipping: {
                type: Number,
                required: true,
                min: 0
            },

            tax: {
                type: Number,
                required: true,
                min: 0
            },

            discount: {
                type: Number,
                default: 0,
                min: 0
            },

            couponCode: {
                type: String,
                default: null
            },

            total: {
                type: Number,
                required: true,
                min: 0
            }
        },

        shippingAddress: {
            name: String,
            phone: String,
            addressLine1: String,
            addressLine2: String,
            city: String,
            state: String,
            country: String,
            pincode: String
        },

        shipping: {
            pickupPincode: String,
            deliveryPincode: String,

            courierId: {
                type: Number,
                default: null
            },

            courierName: {
                type: String,
                default: null
            },

            shippingCharge: {
                type: Number,
                min: 0
            },

            estimatedDelivery: Date,

            // Packed box list snapshotted from the Shiprocket quote at
            // order time — the fulfilment pipeline reads box dimensions
            // from here when creating the Shiprocket order.
            packages: {
                type: [mongoose.Schema.Types.Mixed],
                default: []
            },

            // Shiprocket handles populated after post-payment fulfilment.
            shiprocketOrderId: { type: String, default: null },
            shipmentId: { type: String, default: null },
            awbCode: { type: String, default: null },
            labelUrl: { type: String, default: null },
            invoiceUrl: { type: String, default: null },
            trackingUrl: { type: String, default: null },

            // Pickup scheduling status is set when admin triggers the
            // pickup call from the orders view. Keeping it loose on
            // purpose — Shiprocket's statuses are an open set.
            pickupStatus: { type: String, default: null },
            pickupScheduledFor: { type: Date, default: null },

            // Latest shipment status pushed by Shiprocket's webhook,
            // kept raw so the admin UI can show the real courier label
            // ("Out for Delivery", "RTO Initiated", etc.) even when our
            // mapped Order.status is coarser.
            lastShipmentStatus: { type: String, default: null },
            lastShipmentStatusAt: { type: Date, default: null },

            // Last successful sync with Shiprocket, and the error from
            // the most recent failed attempt (cleared on next success).
            // The admin orders view uses `error` to flag orders that
            // need manual intervention after a failed AWB assignment.
            syncedAt: { type: Date, default: null },
            error: { type: String, default: null }
        },
        payment: {
            method: {
                type: String,
                enum: [
                    "ONLINE",
                    "CASH",
                    "UPI",
                    "CARD"
                ],
                default: null
            },

            provider: {
                type: String,
                enum: [
                    "RAZORPAY",
                    "CASH",
                    "UPI",
                    "CARD"
                ],
                default: null
            },

            status: {
                type: String,
                enum: [
                    "PENDING",
                    "PAID",
                    "FAILED",
                    "REFUNDED"
                ],
                default: "PENDING"
            },

            paymentOrderId: {
                type: String,
                default: null
            },

            transactionId: {
                type: String,
                default: null
            },

            paidAt: {
                type: Date,
                default: null
            }
        },

        notes: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.Order ||
    mongoose.model("Order", orderSchema);