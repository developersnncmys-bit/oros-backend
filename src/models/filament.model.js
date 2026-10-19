import mongoose from "mongoose";

const filamentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "filament name is required"],
            trim: true,
            unique: true
        },

        // e.g. "PLA Pro", "PLA Plus", "PETG-HS", "ABS" — the material family
        type: {
            type: String,
            required: true,
            trim: true
        },

        // Optional top-level grouping ("Pure", "Radiant", "Special" per the
        // inventory PDF). Nullable so legacy filaments survive without
        // backfill; admin can assign later.
        colorFamily: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ColorFamily",
            default: null
        },

        // The parenthetical from the inventory PDF — "Regular", "Matte",
        // "Silk", "Metallic", "Glow", "Sparkle", "Translucent", etc.
        // Free text with admin-side suggestions so new finishes don't
        // require a backend change.
        finish: {
            type: String,
            trim: true,
            default: ""
        },

        // Flat ₹ added to base product price when this filament is chosen
        priceDelta: {
            type: Number,
            default: 0,
            min: 0
        },

        // Multiplier applied to base price (1 = unchanged, 1.5 = +50%)
        priceMultiplier: {
            type: Number,
            default: 1,
            min: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.Filament ||
    mongoose.model("Filament", filamentSchema);
