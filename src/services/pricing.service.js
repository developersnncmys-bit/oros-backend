import ProductOption
    from "../models/productOption.model.js";

import ProductOptionValue
    from "../models/productOptionValue.model.js";


export const calculateCartPricing =
    async (cartItems) => {

        let subtotal = 0;

        let tax = 0;

        const items = [];


        for (
            const cartItem
            of cartItems
        ) {

            /*
             * Product is already populated
             * by order.service.js
             */

            const product =
                cartItem.product;


            if (!product) {

                throw new Error(
                    "Product not found"
                );
            }


            /*
             * Product must be published
             */

            if (
                product.status !==
                "PUBLISHED"
            ) {

                throw new Error(
                    `${product.name} is unavailable`
                );
            }


            /*
             * Start with base price
             */

            let unitPrice =
                product.basePrice;


            /*
             * Apply selected options
             *
             * "Filament" and "Color" are pseudo-options the storefront
             * synthesizes from the global filament catalog — they don't live
             * in ProductOption. Their priceDelta/priceMultiplier are already
             * carried on the cart item, so we read them straight off instead
             * of looking them up.
             */

            const PSEUDO_OPTION_NAMES = new Set(["filament", "color"]);

            for (
                const selectedOption
                of cartItem.selectedOptions || []
            ) {

                if (
                    PSEUDO_OPTION_NAMES.has(
                        (selectedOption.name || "").toLowerCase()
                    )
                ) {
                    unitPrice +=
                        Number(selectedOption.priceDelta) || 0;

                    const multiplier =
                        Number(selectedOption.priceMultiplier);

                    unitPrice *=
                        Number.isFinite(multiplier) && multiplier > 0
                            ? multiplier
                            : 1;

                    continue;
                }

                const option =
                    await ProductOption.findOne({

                        product:
                            product._id,

                        name:
                            selectedOption.name

                    }).lean();


                if (!option) {

                    throw new Error(
                        `Invalid option: ${selectedOption.name}`
                    );
                }


                const optionValue =
                    await ProductOptionValue.findOne({

                        option:
                            option._id,

                        value:
                            selectedOption.value

                    }).lean();


                if (!optionValue) {

                    throw new Error(
                        `Invalid value: ${selectedOption.value}`
                    );
                }


                /*
                 * Add fixed price
                 */

                unitPrice +=
                    optionValue.priceDelta || 0;


                /*
                 * Apply multiplier
                 */

                unitPrice *=
                    optionValue.priceMultiplier || 1;
            }


            /*
             * Calculate line total
             */

            const lineTotal =
                unitPrice *
                cartItem.qty;


            /*
             * Calculate tax
             */

            const taxAmount =
                lineTotal *
                (
                    (cartItem.taxRate || 0)
                    / 100
                );


            subtotal +=
                lineTotal;


            tax +=
                taxAmount;


            /*
             * Order item snapshot
             */

            items.push({

                product:
                    product._id,

                nameSnapshot:
                    product.name,

                skuSnapshot:
                    product.sku,

                qty:
                    cartItem.qty,

                unitPrice,

                selectedOptions:
                    cartItem.selectedOptions || [],

                personalisation:
                    cartItem.personalisation || {},

                taxRate:
                    cartItem.taxRate || 0,

                taxAmount,

                lineTotal

            });
        }


        return {

            items,

            subtotal,

            tax

        };
    };