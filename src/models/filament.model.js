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
