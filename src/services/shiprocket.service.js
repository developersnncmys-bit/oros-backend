import axios from "axios";
import httpError from "../utils/httpError.js";


const getShiprocketToken =
    async () => {

        const response =
            await axios.post(
                "https://apiv2.shiprocket.in/v1/external/auth/login",
                {
                    email:
                        process.env.SHIPROCKET_EMAIL,

                    password:
                        process.env.SHIPROCKET_PASSWORD
                },
                {
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


        const token =
            response?.data?.token;


        if (!token) {

            throw httpError(
                500,
                "Failed to generate Shiprocket token"
            );
        }


        return token;
    };


export const getShiprocketRates =
    async ({
        pickupPincode,
        deliveryPincode,
        packages
    }) => {

        /*
         * Get fresh token from Shiprocket
         */

        const token =
            await getShiprocketToken();


        /*
         * Calculate total package weight
         */

        const totalWeight =
            packages.reduce(
                (total, pkg) =>
                    total +
                    Number(pkg.weight),
                0
            );


        try {

            const response =
                await axios.get(
                    "https://apiv2.shiprocket.in/v1/external/courier/serviceability/",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        },

                        params: {

                            pickup_postcode:
                                pickupPincode,

                            delivery_postcode:
                                deliveryPincode,

                            weight:
                                totalWeight,

                            cod: 0
                        }
                    }
                );


            const couriers =
                response
                    ?.data
                    ?.data
                    ?.available_courier_companies;


            if (
                !couriers ||
                !couriers.length
            ) {

                throw httpError(
                    400,
                    "No shipping rates available"
                );
            }


            return couriers.map(
                courier => ({

                    courierId:
                        courier
                            .courier_company_id,

                    courierName:
                        courier
                            .courier_name,

                    rate:
                        Number(
                            courier.rate
                        ),

                    estimatedDays:
                        courier.etd,

                    freightCharge:
                        Number(
                            courier.freight_charge
                        ),

                    codCharge:
                        Number(
                            courier.cod_charges
                        ),

                    totalCharge:
                        Number(
                            courier.rate
                        )
                })
            );

        } catch (error) {

            if (error.statusCode) {
                throw error;
            }

            throw httpError(
                500,
                error
                    ?.response
                    ?.data
                    ?.message ||
                "Shiprocket rate request failed"
            );
        }
    };


// Pickup location lookup is cached because the Shiprocket dashboard
// edits are rare and every rate request would otherwise pay for two
// upstream calls (auth + pickup list). TTL is short enough that a
// dashboard change is picked up without a server restart.
const PICKUP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let pickupCache = { value: null, expiresAt: 0 };

const normalizeLocationName = (s) =>
    String(s || "").trim().toLowerCase();

/**
 * Resolve the configured Shiprocket pickup location (by name set in
 * SHIPROCKET_PICKUP_LOCATION, defaults to "Primary") into its pincode.
 * Replaces the old SHIPMENT_PICKUP_PINCODE env var — the pincode now
 * comes from the Shiprocket dashboard so there's a single source of
 * truth. Cached in-memory to avoid an extra upstream call per rate.
 */
export const getShiprocketPickupPincode = async () => {
    if (pickupCache.value && pickupCache.expiresAt > Date.now()) {
        return pickupCache.value;
    }

    const token = await getShiprocketToken();
    const wantedName =
        process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";

    try {
        const response = await axios.get(
            "https://apiv2.shiprocket.in/v1/external/settings/company/pickup",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const locations =
            response?.data?.data?.shipping_address ||
            response?.data?.shipping_address ||
            [];

        const match = locations.find(
            (loc) =>
                normalizeLocationName(loc.pickup_location) ===
                normalizeLocationName(wantedName)
        );

        if (!match) {
            throw httpError(
                500,
                `Shiprocket pickup location "${wantedName}" not found. Configure it in the Shiprocket dashboard or set SHIPROCKET_PICKUP_LOCATION.`
            );
        }

        const pincode = String(match.pin_code || match.pincode || "").trim();
        if (!pincode) {
            throw httpError(
                500,
                `Shiprocket pickup location "${wantedName}" has no pincode configured.`
            );
        }

        pickupCache = {
            value: pincode,
            expiresAt: Date.now() + PICKUP_CACHE_TTL_MS
        };
        return pincode;
    } catch (error) {
        if (error.statusCode) throw error;
        throw httpError(
            500,
            extractShiprocketError(
                error,
                "Failed to fetch Shiprocket pickup location"
            )
        );
    }
};


// Shiprocket wraps every error payload differently depending on the
// endpoint. This helper picks the most informative string out of their
// usual envelopes so our error reaches the admin instead of a generic
// "500 Request failed".
const extractShiprocketError = (error, fallback) => {
    const data = error?.response?.data;
    if (data?.message) return String(data.message);
    if (typeof data === "string") return data;
    if (data?.errors && typeof data.errors === "object") {
        const first = Object.values(data.errors)[0];
        if (Array.isArray(first) && first.length) return String(first[0]);
    }
    return fallback;
};


const BOUNDING_BOX_ROUND = (n) =>
    Math.max(1, Math.round(Number(n) || 0));


// Shiprocket's /orders/create/adhoc wants a single outer box per order.
// Our packing service may hand back multiple boxes, so sum the weights
// and take the largest footprint across them — safe over-reporting is
// better than under-reporting, since Shiprocket re-weighs on pickup.
const combineBoundingBox = (packages = []) => {
    if (!packages.length) {
        return { length: 10, breadth: 10, height: 10, weight: 0.5 };
    }
    const weight = packages.reduce(
        (sum, pkg) => sum + (Number(pkg.weight) || 0),
        0
    );
    const length = Math.max(
        ...packages.map((pkg) => Number(pkg.length) || 0)
    );
    const breadth = Math.max(
        ...packages.map((pkg) => Number(pkg.breadth) || 0)
    );
    const height = packages.reduce(
        (sum, pkg) => sum + (Number(pkg.height) || 0),
        0
    );
    return {
        length: BOUNDING_BOX_ROUND(length),
        breadth: BOUNDING_BOX_ROUND(breadth),
        height: BOUNDING_BOX_ROUND(height),
        weight: Math.max(0.1, Number(weight.toFixed(3)))
    };
};


/**
 * Create a Shiprocket order against the Prepaid flow. The returned
 * payload includes a `shipment_id`, which is what every follow-up
 * call (AWB, pickup, label) uses.
 */
export const createShiprocketOrder = async (order, items) => {
    const token = await getShiprocketToken();

    const addr = order.shippingAddress || {};
    const [firstName, ...rest] = String(addr.name || "Customer")
        .trim()
        .split(/\s+/);
    const lastName = rest.join(" ") || firstName;

    const box = combineBoundingBox(order.shipping?.packages);

    const pickupLocation =
        process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";

    const body = {
        order_id: String(order._id),
        order_date: new Date(order.createdAt || Date.now())
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),
        pickup_location: pickupLocation,

        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: addr.addressLine1 || "",
        billing_address_2: addr.addressLine2 || "",
        billing_city: addr.city || "",
        billing_pincode: addr.pincode || "",
        billing_state: addr.state || "",
        billing_country: addr.country || "India",
        billing_email: order.user?.email || "no-reply@oros.local",
        billing_phone: addr.phone || "",

        shipping_is_billing: true,

        order_items: (items || []).map((item) => ({
            name: item.nameSnapshot,
            sku: item.skuSnapshot,
            units: item.qty,
            selling_price: item.unitPrice,
            discount: 0,
            tax: item.taxAmount || 0,
            hsn: ""
        })),

        payment_method: "Prepaid",
        sub_total: order.pricing?.subtotal || 0,

        length: box.length,
        breadth: box.breadth,
        height: box.height,
        weight: box.weight
    };

    try {
        const response = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
            body,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const data = response?.data || {};
        if (!data.shipment_id) {
            throw httpError(
                502,
                extractShiprocketError(
                    { response },
                    "Shiprocket did not return a shipment id"
                )
            );
        }

        return {
            shiprocketOrderId: String(data.order_id),
            shipmentId: String(data.shipment_id),
            status: data.status || null
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw httpError(
            502,
            extractShiprocketError(
                error,
                "Shiprocket order creation failed"
            )
        );
    }
};


/**
 * Assign an AWB to an existing Shiprocket shipment. We pass the courier
 * the customer picked at checkout as `courier_id` so Shiprocket honours
 * their choice when it's still available — if not, Shiprocket picks the
 * cheapest serviceable alternative and the caller surfaces that.
 */
export const assignAWBToShipment = async (shipmentId, courierId) => {
    const token = await getShiprocketToken();

    try {
        const response = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
            {
                shipment_id: Number(shipmentId),
                courier_id: courierId ? Number(courierId) : undefined
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const payload = response?.data?.response?.data || response?.data || {};
        const awb = payload.awb_code || payload.awb_number || null;

        if (!awb) {
            throw httpError(
                502,
                extractShiprocketError(
                    { response },
                    "Shiprocket did not return an AWB"
                )
            );
        }

        return {
            awbCode: String(awb),
            courierId: payload.courier_company_id || courierId || null,
            courierName: payload.courier_name || null,
            labelUrl: payload.label_url || null,
            invoiceUrl: payload.invoice_url || null
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw httpError(
            502,
            extractShiprocketError(
                error,
                "Shiprocket AWB assignment failed"
            )
        );
    }
};


/**
 * Ask Shiprocket to schedule a pickup for the shipment. This is a
 * separate concern from AWB assignment: admin triggers it from the
 * orders view when they're ready to hand the parcel over.
 */
export const requestShiprocketPickup = async (shipmentId) => {
    const token = await getShiprocketToken();

    try {
        const response = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
            { shipment_id: [Number(shipmentId)] },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const payload = response?.data?.response || response?.data || {};
        return {
            pickupStatus:
                payload.pickup_status ||
                payload.status ||
                "SCHEDULED",
            pickupScheduledFor:
                payload.pickup_scheduled_date ||
                payload.pickup_date ||
                null
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw httpError(
            502,
            extractShiprocketError(
                error,
                "Shiprocket pickup request failed"
            )
        );
    }
};