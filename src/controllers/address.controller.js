import {
    listAddressesService,
    createAddressService,
    updateAddressByIdService,
    setDefaultAddressService,
    deleteAddressByIdService
} from "../services/address.service.js";


export const listAddressesController =
    async (req, res, next) => {
        try {
            const result =
                await listAddressesService(
                    req.user.id
                );
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };


export const createAddressController =
    async (req, res, next) => {
        try {
            const result =
                await createAddressService(
                    req.user.id,
                    req.body
                );
            return res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };


export const updateAddressController =
    async (req, res, next) => {
        try {
            const result =
                await updateAddressByIdService(
                    req.user.id,
                    req.params.id,
                    req.body
                );
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };


export const setDefaultAddressController =
    async (req, res, next) => {
        try {
            const result =
                await setDefaultAddressService(
                    req.user.id,
                    req.params.id
                );
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };


export const deleteAddressController =
    async (req, res, next) => {
        try {
            const result =
                await deleteAddressByIdService(
                    req.user.id,
                    req.params.id
                );
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
