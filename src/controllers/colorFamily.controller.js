import {
    listColorFamiliesService,
    createColorFamilyService,
    updateColorFamilyService,
    deleteColorFamilyService
} from "../services/colorFamily.service.js";

export const listColorFamilies = async (req, res) => {
    const { message, data } = await listColorFamiliesService();
    res.json({ success: true, message, data });
};

export const createColorFamily = async (req, res) => {
    const { message, data } = await createColorFamilyService(req.body);
    res.json({ success: true, message, data });
};

export const updateColorFamily = async (req, res) => {
    const { message, data } = await updateColorFamilyService(
        req.params.id,
        req.body
    );
    res.json({ success: true, message, data });
};

export const deleteColorFamily = async (req, res) => {
    const { message, data } = await deleteColorFamilyService(req.params.id);
    res.json({ success: true, message, data });
};
