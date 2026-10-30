import express from "express";

import {
    listAddressesController,
    createAddressController,
    updateAddressController,
    setDefaultAddressController,
    deleteAddressController
} from "../controllers/address.controller.js";

import {
    protect
} from "../middlewares/auth.middleware.js";


const router = express.Router();


router.use(protect);


router.get("/", listAddressesController);

router.post("/", createAddressController);

router.patch("/:id", updateAddressController);

router.patch("/:id/default", setDefaultAddressController);

router.delete("/:id", deleteAddressController);


export default router;
