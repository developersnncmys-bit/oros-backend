import mongoose from "mongoose";

const filamentColorSchema = new mongoose.Schema(
    {
        filament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Filament",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: [true, "color name is required"],
            trim: true
        },

        // Primary hex (e.g. "#4b5320"). For dual/tri color silks pack extras
        // into hexSecondary / hexTertiary so the swatch can render stripes.
        hex: {
            type: String,
            required: true,
            trim: true
        },

        hexSecondary: {
            type: String,
            default: "",
            trim: true
        },

        hexTertiary: {
            type: String,
            default: "",
            trim: true
        },

        // Units in stock. 0 = out of stock (surface as disabled on the storefront).
        stock: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

// A color name is unique per filament, not globally — "Pitch Black" exists
// in both PLA Pro and PETG-HS as separate inventory lines.
filamentColorSchema.index({ filament: 1, name: 1 }, { unique: true });

export default mongoose.models.FilamentColor ||
    mongoose.model("FilamentColor", filamentColorSchema);
