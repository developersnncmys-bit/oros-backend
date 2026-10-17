import {
    listFilamentsService,
    createFilamentService,
    updateFilamentService,
    deleteFilamentService,
    addColorService,
    updateColorService,
    deleteColorService
} from "../services/filament.service.js";

export const listFilaments = async (req, res) => {
    const { message, data } = await listFilamentsService();
    res.json({ success: true, message, data });
};

export const createFilament = async (req, res) => {
    const { message, data } = await createFilamentService(req.body);
    res.json({ success: true, message, data });
};

export const updateFilament = async (req, res) => {
    const { message, data } = await updateFilamentService(req.params.id, req.body);
    res.json({ success: true, message, data });
};

export const deleteFilament = async (req, res) => {
    const { message, data } = await deleteFilamentService(req.params.id);
    res.json({ success: true, message, data });
};

export const addColor = async (req, res) => {
    const { message, data } = await addColorService(req.params.id, req.body);
    res.json({ success: true, message, data });
};

export const updateColor = async (req, res) => {
    const { message, data } = await updateColorService(req.params.colorId, req.body);
    res.json({ success: true, message, data });
};

export const deleteColor = async (req, res) => {
    const { message, data } = await deleteColorService(req.params.colorId);
    res.json({ success: true, message, data });
};
