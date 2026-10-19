import mongoose from "mongoose";

// Top-level grouping for filament materials. The three on the inventory
// PDF are "Pure", "Radiant", and "Special", but admins can add more.
// Keep this independent from Filament — a family exists even if nothing
// references it yet.
const colorFamilySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "color family name is required"],
            trim: true,
            unique: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        // Lower = earlier in picker lists. Admin-controlled.
        displayOrder: {
            type: Number,
            default: 0
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

export default mongoose.models.ColorFamily ||
    mongoose.model("ColorFamily", colorFamilySchema);
