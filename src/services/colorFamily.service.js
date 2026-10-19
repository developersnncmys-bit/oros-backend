import ColorFamily from "../models/colorFamily.model.js";
import Filament from "../models/filament.model.js";

export const listColorFamiliesService = async () => {
    const families = await ColorFamily.find()
        .sort({ displayOrder: 1, name: 1 })
        .lean();

    return {
        message: "all color families",
        data: { colorFamilies: families }
    };
};

export const createColorFamilyService = async (data) => {
    const exists = await ColorFamily.findOne({ name: data.name });
    if (exists) throw new Error("color family already exists");

    const family = await ColorFamily.create({
        name: data.name,
        description: data.description || "",
        displayOrder: Number(data.displayOrder) || 0,
        isActive: data.isActive !== false
    });

    return {
        message: "color family created",
        data: { colorFamily: family }
    };
};

export const updateColorFamilyService = async (id, data) => {
    const family = await ColorFamily.findByIdAndUpdate(
        id,
        {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && {
                description: data.description
            }),
            ...(data.displayOrder !== undefined && {
                displayOrder: Number(data.displayOrder)
            }),
            ...(data.isActive !== undefined && { isActive: data.isActive })
        },
        { new: true, runValidators: true }
    );
    if (!family) throw new Error("color family not found");

    return {
        message: "color family updated",
        data: { colorFamily: family }
    };
};

export const deleteColorFamilyService = async (id) => {
    const family = await ColorFamily.findById(id);
    if (!family) throw new Error("color family not found");

    // Don't orphan filaments — unset the reference, then delete the family.
    // (The ref is optional on the filament model, so unsetting is safe.)
    await Filament.updateMany(
        { colorFamily: id },
        { $unset: { colorFamily: "" } }
    );
    await ColorFamily.findByIdAndDelete(id);

    return {
        message: "color family deleted",
        data: { colorFamily: family }
    };
};
