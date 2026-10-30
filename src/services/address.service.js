import mongoose from "mongoose";
import Address from "../models/address.model.js";
import httpError from "../utils/httpError.js";


const REQUIRED_FIELDS = [
    "name",
    "phone",
    "addressLine1",
    "city",
    "state",
    "pincode"
];


const assertRequired = (data) => {
    for (const field of REQUIRED_FIELDS) {
        if (!data?.[field] || !String(data[field]).trim()) {
            throw httpError(
                400,
                `${field} is required`
            );
        }
    }
};


const buildAddressPayload = (data) => ({
    name: data.name,
    phone: data.phone,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2,
    landmark: data.landmark,
    city: data.city,
    state: data.state,
    country: data.country || "India",
    pincode: data.pincode
});


// Used by order + shipping services when the caller did not pick a
// specific address — falls back to the user's default, or the most
// recently updated one if no default has been marked yet.
export const findResolvedAddress = async (
    userId,
    addressId
) => {

    if (addressId) {

        if (!mongoose.isValidObjectId(addressId)) {
            throw httpError(
                400,
                "Invalid address id"
            );
        }

        const address =
            await Address.findOne({
                _id: addressId,
                user: userId
            }).lean();

        if (!address) {
            throw httpError(
                404,
                "Selected address not found"
            );
        }

        return address;
    }

    return (
        (await Address.findOne({
            user: userId,
            isDefault: true
        }).lean()) ||
        (await Address.findOne({
            user: userId
        })
            .sort({ updatedAt: -1 })
            .lean())
    );
};


export const listAddressesService =
    async (userId) => {

        const addresses =
            await Address.find({ user: userId })
                .sort({
                    isDefault: -1,
                    updatedAt: -1
                })
                .lean();

        return {
            message:
                "Addresses fetched successfully",

            data: {
                addresses
            }
        };
    };


export const createAddressService =
    async (userId, data) => {

        assertRequired(data);

        const existingCount =
            await Address.countDocuments({
                user: userId
            });

        // First address is implicitly the default. If the caller asks
        // for isDefault explicitly, flip the previous default off.
        const shouldBeDefault =
            existingCount === 0 ||
            data.isDefault === true;

        if (shouldBeDefault && existingCount > 0) {
            await Address.updateMany(
                {
                    user: userId,
                    isDefault: true
                },
                {
                    $set: { isDefault: false }
                }
            );
        }

        const address =
            await Address.create({
                user: userId,
                ...buildAddressPayload(data),
                isDefault: shouldBeDefault
            });

        return {
            message:
                "Address saved successfully",

            data: {
                address: address.toObject()
            }
        };
    };


export const updateAddressByIdService =
    async (userId, addressId, data) => {

        if (!mongoose.isValidObjectId(addressId)) {
            throw httpError(
                400,
                "Invalid address id"
            );
        }

        // If promoting this address to default, demote the other first
        // so we don't end up with two "default" rows for one user.
        if (data?.isDefault === true) {
            await Address.updateMany(
                {
                    user: userId,
                    isDefault: true,
                    _id: { $ne: addressId }
                },
                {
                    $set: { isDefault: false }
                }
            );
        }

        const update = buildAddressPayload({
            ...data
        });

        if (data?.isDefault === true) {
            update.isDefault = true;
        }

        const address =
            await Address.findOneAndUpdate(
                {
                    _id: addressId,
                    user: userId
                },
                { $set: update },
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!address) {
            throw httpError(
                404,
                "Address not found"
            );
        }

        return {
            message:
                "Address updated successfully",

            data: {
                address: address.toObject()
            }
        };
    };


export const setDefaultAddressService =
    async (userId, addressId) => {

        if (!mongoose.isValidObjectId(addressId)) {
            throw httpError(
                400,
                "Invalid address id"
            );
        }

        const target =
            await Address.findOne({
                _id: addressId,
                user: userId
            });

        if (!target) {
            throw httpError(
                404,
                "Address not found"
            );
        }

        await Address.updateMany(
            {
                user: userId,
                isDefault: true,
                _id: { $ne: addressId }
            },
            { $set: { isDefault: false } }
        );

        target.isDefault = true;
        await target.save();

        return {
            message:
                "Default address updated",

            data: {
                address: target.toObject()
            }
        };
    };


export const deleteAddressByIdService =
    async (userId, addressId) => {

        if (!mongoose.isValidObjectId(addressId)) {
            throw httpError(
                400,
                "Invalid address id"
            );
        }

        const address =
            await Address.findOneAndDelete({
                _id: addressId,
                user: userId
            });

        if (!address) {
            throw httpError(
                404,
                "Address not found"
            );
        }

        // Removing the default — promote the most recently updated
        // remaining address so the user always has one to fall back on.
        if (address.isDefault) {
            const next =
                await Address.findOne({ user: userId })
                    .sort({ updatedAt: -1 });

            if (next) {
                next.isDefault = true;
                await next.save();
            }
        }

        return {
            message:
                "Address deleted successfully"
        };
    };
