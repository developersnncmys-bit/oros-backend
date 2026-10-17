import mongoose from "mongoose";
import Filament from "../models/filament.model.js";
import FilamentColor from "../models/filamentColor.model.js";
import { httpError } from "../utils/httpError.js";

/*
--------------------------------
Filaments
--------------------------------
*/

export const listFilamentsService = async () => {
    const filaments = await Filament.find().sort({ type: 1, name: 1 }).lean();

    const colors = await FilamentColor.find({
        filament: { $in: filaments.map((f) => f._id) }
    })
        .sort({ name: 1 })
        .lean();

    const colorsByFilament = colors.reduce((acc, color) => {
        const key = String(color.filament);
        (acc[key] = acc[key] || []).push(color);
        return acc;
    }, {});

    const withColors = filaments.map((f) => ({
        ...f,
        colors: colorsByFilament[String(f._id)] || []
    }));

    return {
        message: "all filaments",
        data: { filaments: withColors }
    };
};

export const createFilamentService = async (data) => {
    const exists = await Filament.findOne({ name: data.name });
    if (exists) throw new Error("filament already exists");

    const filament = await Filament.create({
        name: data.name,
        type: data.type,
        priceDelta: Number(data.priceDelta) || 0,
        priceMultiplier: Number(data.priceMultiplier) || 1,
        isActive: data.isActive !== false
    });

    return {
        message: "filament created",
        data: { filament }
    };
};

export const updateFilamentService = async (id, data) => {
    const filament = await Filament.findByIdAndUpdate(
        id,
        {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.type !== undefined && { type: data.type }),
            ...(data.priceDelta !== undefined && {
                priceDelta: Number(data.priceDelta)
            }),
            ...(data.priceMultiplier !== undefined && {
                priceMultiplier: Number(data.priceMultiplier)
            }),
            ...(data.isActive !== undefined && { isActive: data.isActive })
        },
        { new: true, runValidators: true }
    );
    if (!filament) throw new Error("filament not found");

    return {
        message: "filament updated",
        data: { filament }
    };
};

export const deleteFilamentService = async (id) => {
    const filament = await Filament.findById(id);
    if (!filament) throw new Error("filament not found");

    await FilamentColor.deleteMany({ filament: id });
    await Filament.findByIdAndDelete(id);

    return {
        message: "filament deleted",
        data: { filament }
    };
};

/*
--------------------------------
Filament colors
--------------------------------
*/

export const addColorService = async (filamentId, data) => {
    const filament = await Filament.findById(filamentId);
    if (!filament) throw new Error("filament not found");

    const color = await FilamentColor.create({
        filament: filamentId,
        name: data.name,
        hex: data.hex,
        hexSecondary: data.hexSecondary || "",
        hexTertiary: data.hexTertiary || "",
        stock: Number(data.stock) || 0
    });

    return {
        message: "color added",
        data: { color }
    };
};

export const updateColorService = async (colorId, data) => {
    const color = await FilamentColor.findByIdAndUpdate(
        colorId,
        {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.hex !== undefined && { hex: data.hex }),
            ...(data.hexSecondary !== undefined && {
                hexSecondary: data.hexSecondary
            }),
            ...(data.hexTertiary !== undefined && {
                hexTertiary: data.hexTertiary
            }),
            ...(data.stock !== undefined && { stock: Number(data.stock) })
        },
        { new: true, runValidators: true }
    );
    if (!color) throw new Error("color not found");

    return {
        message: "color updated",
        data: { color }
    };
};

export const deleteColorService = async (colorId) => {
    const color = await FilamentColor.findByIdAndDelete(colorId);
    if (!color) throw new Error("color not found");

    return {
        message: "color deleted",
        data: { color }
    };
};

/*
--------------------------------
Stock accounting from order items
--------------------------------

The storefront injects filament/color selections as pseudo-options named
"Filament" and "Color" in cart items' selectedOptions. These helpers
resolve those pairs back to FilamentColor documents and adjust stock.
*/

const FILAMENT_OPTION_NAME = "Filament";
const COLOR_OPTION_NAME = "Color";

const findOption = (options, name) =>
    (options || []).find(
        (o) => (o.name || "").toLowerCase() === name.toLowerCase()
    );

// Given one order/cart item, resolve the FilamentColor doc the customer
// picked. Returns null if the item isn't a filament selection at all.
export const resolveColorFromOptions = async (selectedOptions) => {
    const filamentOpt = findOption(selectedOptions, FILAMENT_OPTION_NAME);
    const colorOpt = findOption(selectedOptions, COLOR_OPTION_NAME);
    if (!filamentOpt || !colorOpt) return null;

    const filament = await Filament.findOne({ name: filamentOpt.value }).lean();
    if (!filament) return null;

    const color = await FilamentColor.findOne({
        filament: filament._id,
        name: colorOpt.value
    });
    return color || null;
};

// Walk every item, verify its chosen color still has enough stock. Throws
// 409 if any item would overdraw — the caller aborts the whole order.
export const assertColorsAvailable = async (items) => {
    for (const item of items || []) {
        const color = await resolveColorFromOptions(item.selectedOptions);
        if (!color) continue;

        const qty = Number(item.qty) || 0;
        if (color.stock < qty) {
            throw httpError(
                409,
                `${color.name} is out of stock (only ${color.stock} left)`
            );
        }
    }
};

// Atomically decrement each color's stock. The $gte guard prevents going
// negative even under concurrent orders; a failed update means someone
// else grabbed the last units between our check and this decrement.
export const decrementColorStocks = async (items) => {
    const warnings = [];

    for (const item of items || []) {
        const color = await resolveColorFromOptions(item.selectedOptions);
        if (!color) continue;

        const qty = Number(item.qty) || 0;
        if (!qty) continue;

        const updated = await FilamentColor.findOneAndUpdate(
            { _id: color._id, stock: { $gte: qty } },
            { $inc: { stock: -qty } },
            { new: true }
        );

        if (!updated) {
            warnings.push(
                `${color.name}: stock went negative before decrement (ordered ${qty}, had ${color.stock})`
            );
        }
    }

    return { warnings };
};

// Mirror of decrement — used on cancellation/refund of a paid order.
export const restoreColorStocks = async (items) => {
    for (const item of items || []) {
        const color = await resolveColorFromOptions(item.selectedOptions);
        if (!color) continue;

        const qty = Number(item.qty) || 0;
        if (!qty) continue;

        await FilamentColor.findByIdAndUpdate(color._id, {
            $inc: { stock: qty }
        });
    }
};
