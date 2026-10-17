// One-off seed for the filament catalog, lifted from the Filament Inventory PDF.
// Run with: node scripts/seedFilaments.js
// Safe to re-run — upserts by (filament name, color name).

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Filament from "../src/models/filament.model.js";
import FilamentColor from "../src/models/filamentColor.model.js";

const CATALOG = [
    {
        name: "PLA Pro",
        type: "PLA",
        colors: [
            { name: "Army Green", hex: "#4b5320" },
            { name: "Dark Gray", hex: "#3f3f41" },
            { name: "Grass Green", hex: "#4ea64b" },
            { name: "Light Blue", hex: "#1b7fb8" },
            { name: "Nuclear Red", hex: "#c92a2a" },
            { name: "Outrageous Orange", hex: "#e55a1a" },
            { name: "Pitch Black", hex: "#000000" },
            { name: "Pure White", hex: "#f5f5f5" },
            { name: "Transparent", hex: "#eeeeee" }
        ]
    },
    {
        name: "PLA Plus",
        type: "PLA",
        colors: [
            { name: "Chocolate Brown", hex: "#8b4a2b" },
            { name: "Midnight Gray", hex: "#2f3238" },
            { name: "Royal Blue", hex: "#1e3a8a" },
            { name: "Imperial Red", hex: "#7a0e13" },
            { name: "Thanos Purple", hex: "#7a53c6" },
            { name: "Rust Copper", hex: "#9b4e2a" },
            { name: "Bahama Yellow", hex: "#ffe77a" }
        ]
    },
    {
        name: "PLA Matte",
        type: "PLA",
        colors: [
            { name: "Skin", hex: "#f7d9c4" },
            { name: "Moon Gray", hex: "#9fa5ac" },
            { name: "Lilac Purple", hex: "#9a7dc1" }
        ]
    },
    {
        name: "PLA Silk",
        type: "PLA",
        priceDelta: 50,
        colors: [
            { name: "Gold", hex: "#c9a227" },
            { name: "Copper", hex: "#b06a2e" }
        ]
    },
    {
        name: "PLA Dual Color Silk",
        type: "PLA",
        priceDelta: 80,
        colors: [
            { name: "Red - Black", hex: "#e60012", hexSecondary: "#000000" }
        ]
    },
    {
        name: "PLA Tri Color Silk",
        type: "PLA",
        priceDelta: 120,
        colors: [
            {
                name: "Copper - Silver - Gold",
                hex: "#d9d9d9",
                hexSecondary: "#c9a227",
                hexTertiary: "#b06a2e"
            },
            {
                name: "Black - Purple - Orange",
                hex: "#000000",
                hexSecondary: "#7a53c6",
                hexTertiary: "#e55a1a"
            }
        ]
    },
    {
        name: "PLA Glow",
        type: "PLA",
        priceDelta: 60,
        colors: [{ name: "Orange", hex: "#f39112" }]
    },
    {
        name: "PLA Starlight",
        type: "PLA",
        priceMultiplier: 1.5,
        colors: [{ name: "Nebula", hex: "#4a3b7a" }]
    },
    {
        name: "PLA Metallic",
        type: "PLA",
        priceDelta: 40,
        colors: [
            { name: "Titanium Blue", hex: "#2d3f6f" },
            { name: "Ferrous Green", hex: "#20543f" },
            { name: "Sunset Bronze", hex: "#8a7467" },
            { name: "Burnished Copper", hex: "#754a46" }
        ]
    },
    {
        name: "PLA Marble",
        type: "PLA",
        priceDelta: 30,
        colors: [{ name: "White Marble", hex: "#f3f3f3" }]
    },
    {
        name: "PETG-HS",
        type: "PETG",
        priceDelta: 20,
        colors: [
            { name: "Pitch Black", hex: "#000000" },
            { name: "Pure White", hex: "#eeeae0" },
            { name: "Lemon Yellow", hex: "#f3ad1b" },
            { name: "Transparent", hex: "#eeeeee" },
            { name: "Simply Silver", hex: "#a4acb6" }
        ]
    },
    {
        name: "PETG-Translucent",
        type: "PETG",
        priceDelta: 30,
        colors: [
            { name: "Green Glitter", hex: "#1caa47" },
            { name: "Hot Pink", hex: "#d81b89" },
            { name: "Orange Glitter", hex: "#f39112" },
            { name: "Red", hex: "#cc1a1a" }
        ]
    },
    {
        name: "ABS",
        type: "ABS",
        priceDelta: 40,
        colors: [
            { name: "Pitch Black", hex: "#000000" },
            { name: "Pure White", hex: "#f0ede4" },
            { name: "Lemon Yellow", hex: "#f3ad1b" },
            { name: "Apple Red", hex: "#c92a2a" },
            { name: "Burnt Orange", hex: "#d9541e" },
            { name: "Royal Blue", hex: "#1e3a8a" },
            { name: "Light Gray", hex: "#9ca0a8" },
            { name: "Grass Green", hex: "#4ea64b" },
            { name: "Natural", hex: "#fbf3d9" }
        ]
    },
    {
        name: "ASA",
        type: "ASA",
        priceDelta: 50,
        colors: [
            { name: "Pitch Black", hex: "#000000" },
            { name: "Pure White", hex: "#f5f5f5" }
        ]
    }
];

const run = async () => {
    await connectDB();

    for (const entry of CATALOG) {
        const filament = await Filament.findOneAndUpdate(
            { name: entry.name },
            {
                name: entry.name,
                type: entry.type,
                priceDelta: entry.priceDelta ?? 0,
                priceMultiplier: entry.priceMultiplier ?? 1,
                isActive: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        for (const color of entry.colors) {
            await FilamentColor.findOneAndUpdate(
                { filament: filament._id, name: color.name },
                {
                    $set: {
                        filament: filament._id,
                        name: color.name,
                        hex: color.hex,
                        hexSecondary: color.hexSecondary || "",
                        hexTertiary: color.hexTertiary || ""
                    },
                    // Only set stock on insert; don't stomp existing inventory.
                    $setOnInsert: { stock: 0 }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        console.log(`✓ ${entry.name} (${entry.colors.length} colors)`);
    }

    console.log("\nFilament catalog seeded.");
    await mongoose.disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
