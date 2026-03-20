import {Router} from "express";
import {contactsClient} from "../clients/contactsClient.js";
import schema, {Party, SaleOrderItem} from "../db/schema.js";
import {PbxRepository} from "../el/pbx.js";
import {
    OrderItemType,
    ShipmentMethodType
} from "../models/domain.js";
import {and, eq, like} from "drizzle-orm";
import logger from "@ailoo/shared-libs/logger";
import {db as drizzleDb} from "../db/drizzle.js";
import {Cart, CartCoupon, CartItemType} from "../models/cart-models.js";
import {findCart} from "../services/cartService.js";
import {stockByStore} from "../db/inventory.js";
import container from "../container/index.js";
import * as cartHelper from "../helpers/cart-helper.js"
import {updateCart} from "../el/cart.js";
import {convert} from "../services/exchangeService.js";

import { Rut } from "@ailoo/shared-libs/models/rut"

const router = Router(); // Create a router instead of using 'app'

const {
    contactMechanism,
    party,
    geographicBoundary,
    postalAddress,
    saleOrder,
    saleOrderItem
} = schema


const cartService = container.resolve("cartService");


router.get("/:domainId/shipping/methods", async (req, res, next) => {
    try {
        const {comuna, country} = req.query;
        const domainId = parseInt(req.params.domainId);
        const wuid = req.query.wuid;


        const cart = await findCart(wuid, domainId)

        let quotes
        if (country && country !== "CL") {
            //const countryData = getCountryData(country)
            // const shippingCostInLocalCurrency = await convert(30, "USD", "CLP")
            const shippingCostInLocalCurrency = await convert(30, "USD", "CLP")
            const freeShippingThreshold = await convert(300, "USD", "CLP")
            quotes = [{
                "id": 1,
                "name": "Correos de Chile",
                "price": shippingCostInLocalCurrency,
                "currency": "CLP", // use CLP, webpage converts to selected country
                "oldPrice": 0,
                freeShipping: {
                    amount: freeShippingThreshold,
                    currency: "CLP",
                },
                "preparationDays": {
                    "from": 3,
                    "to": 4
                },
                "estimatedDays": 14,
                "eta": {
                    "from": "2026-03-14T13:00:47.362Z",
                    "to": "2026-03-15T13:00:47.362Z"
                },
                "type": 5
            },]

            return res.json(
                {
                    methods: quotes
                }
            )
        } else {
            quotes = await cartService.listShippingQuotes(cart, Number(comuna), domainId);

            for (var q of quotes.methods) {
                if (q.id === 13) {
                    q.freeShipping = {
                        amount: 150000,
                        currency: "CLP",
                    }
                }
            }

        }


        res.json(quotes)
    } catch (e) {
        next(e)
    }

})

router.get("/:domainId/shipping/set-carrier", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const carrierId = parseInt(req.query.carrierId);
        const wuid = req.query.wuid;

        const cart = await findCart(wuid, domainId);

        cart.shipmentMethod = {id: carrierId};

        await cartService.update(cart)

        res.json(cart.shipmentMethod)
    } catch (e) {
        next(e)
    }

})

router.get("/:domainId/checkout/pickup-date", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const facilityId = parseInt(req.query.facilityId);
        const wuid = req.query.wuid;

        const cart = await findCart(wuid, domainId)


        const pitIds = []
        for (var i of cart.items) {
            if (i.product)
                pitIds.push(i.product.productItemId)
            if (i.packId > 0) {
                i.packContents.forEach((item) => {
                    if (item.product) {
                        pitIds.push(item.product.productItemId);
                    }
                })
            }
        }


        const stocks: any = await stockByStore(facilityId, pitIds, domainId);

        let availableIn2Hours = false;
        if (stocks?.length > 0) {
            availableIn2Hours = stocks.some(s => parseInt(s.Quantity) >= 1)
        }


        var avlDate = addBusinessDays(new Date(), 2);
        var nextDate = new Date()
        nextDate.setDate(avlDate.getDate() + 1);

        let description;

        if (avlDate.getMonth() === nextDate.getMonth()) {
            description = `${avlDate.getDate()} y ${nextDate.getDate()} de ${avlDate.toLocaleDateString('es-CL', {month: 'long'})}`;
        } else {
            description = `${avlDate.getDate()} de ${avlDate.toLocaleDateString('es-CL', {month: 'long'})} y ${nextDate.getDate()} de ${nextDate.toLocaleDateString('es-CL', {month: 'long'})}`;
        }


        res.json({
            "availableIn2Hours": availableIn2Hours,
            "avlFromDate": nextDate,
            "avlToDate": avlDate,
            "description": description,
            "stocks": stocks
        })
    } catch (e) {
        next(e)
    }

})

router.post("/:domainId/checkout/create-order", async (req, res, next) => {

    try {
        const rq = req.body

        logger.info("create-order rq: " + JSON.stringify(rq));
        const domainId = parseInt(req.params.domainId);
        const currency = req.body.currency || "CLP"

        let organizacion : Partial<Party> = null
        if (rq.addresses.askForInvoice) {

            var orgRut : Rut = new Rut(rq.addresses.billing.rut);

            organizacion = await drizzleDb.query.party.findFirst({
                where: (party, { eq, and }) => {
                    return and(
                        eq(party.rut, orgRut.format("#.###-#")),
                        eq(party.type, "ORGANIZATION"),
                        eq(party.domainId, domainId)
                    )
                },
            })

            if(!organizacion){

                organizacion = {
                    name: rq.addresses.billing.name,
                    createDate: new Date(),
                    domainId: domainId,
                    email: rq.addresses.billing.email,
                    rut: orgRut.format("#.###-#"),
                    address: rq.addresses.billing.address,
                    phone: rq.addresses.billing.phone,
                    giro: rq.addresses.billing.giro,
                    comunaId: rq.addresses.billing.comuna.id,
                    type: "ORGANIZATION",
                };

                const [result] = await drizzleDb.insert(schema.party).values(organizacion as Party);

                organizacion.id = result.insertId

                try {
                    await contactsClient.index(organizacion.id, domainId)
                }catch(e){
                    logger.error("Error indexing contact: " + e.message + " " + JSON.stringify(organizacion));
                }
            }
        }


        const result = await drizzleDb.transaction(async (tx) => {

            try {
                let user = null
                let person = null;

                if (rq.userId > 0) {
                    user = await drizzleDb.query.user.findFirst({
                        where: eq(schema.user.id, rq.userId),
                        with: {
                            person: true, // This joins the 'party' table
                        },
                    });
                }

                if (user != null && user.person != null)
                    person = user.person;

                if (person == null)
                    person = await getPartyPartial(rq.customerInformation.email, domainId);

                if (person == null && rq.customerInformation.address?.nif?.length > 0)
                    person = await getPartyPartialByRut(rq.customerInformation.address.nif, domainId);

                if (!person) {

                    // try getting name and surname from customerInformation (db Party)
                    // if not found use information submitted in shipmentInformation
                    let fname = rq.customerInformation.address.name;
                    let lname = rq.customerInformation.address.surnames;
                    let name = rq.customerInformation.address.name;
                    if (!name) {
                        fname = rq.shipmentInformation.address?.name?.trim()
                        lname = rq.shipmentInformation.address?.surnames?.trim()

                        name = fname?.trim() + " " + lname?.trim()
                    }


                    const [result] = await tx.insert(party).values({
                        name: name || null,
                        firstName: fname || null,
                        lastName: lname || null,
                        email: rq.customerInformation.email,
                        comuna: rq.customerInformation.address?.comuna?.name || null,
                        rut: rq.customerInformation.address.nif || '',
                        phone: rq.customerInformation.phone || "",
                        createDate: new Date(),
                        type: "PERSON", // Matches your varchar(20) 'Type' column
                        receiveNewsletter: 1,
                        domainId: domainId,
                    });

                    person = result
                    logger.info("Person does not exist. Creating person for email " + rq.customerInformation.email +
                        ". The partyId is " + person.id);
                    await contactsClient.index(person.id, domainId);
                } else {
                    // update phone
                    await tx
                        .update(party)
                        .set({phone: rq.customerInformation.phone})
                        .where(eq(party.id, person.id));
                }

                logger.info("drizzleDb.transaction 5")
                await PbxRepository.updateParty(rq.customerInformation.phone, person.id, person.name,
                    person.email, domainId);

                logger.info("drizzleDb.transaction 6")
                let postalAddressId = null;
                const cart = await findCart(rq.wuid, domainId)

                let appliedCoupon = null
                if (rq.coupon?.id > 0) {
                    appliedCoupon = await cartHelper.applyCoupon(rq.coupon.name, cart, domainId);
                }


                if (cart.shipmentMethod.id === ShipmentMethodType.StorePickup) {
                    const facilityDb = await drizzleDb.query.facility.findFirst({
                        where: (facility) => eq(facility.id, rq.pickupStore.id),
                        with: {
                            contacts: {
                                with: {
                                    contactMechanism: {
                                        with: {
                                            postalAddress: true
                                        }
                                    }
                                }
                            }
                        }
                    });

                    var contactPostal = facilityDb.contacts.find(c => c.contactMechanism && c.contactMechanism.postalAddress);
                    if (contactPostal) {
                        var postalAddressDb = contactPostal.contactMechanism.postalAddress;
                        postalAddressId = postalAddressDb.postalAddressId

                    }


                } else {
                    const [cmResult] = await tx.insert(contactMechanism).values({});
                    postalAddressId = cmResult.insertId;

                    let phone = rq.shipmentInformation.phone
                    if (!phone) {
                        phone = rq.customerInformation.phone
                    }

                    let countryId = null
                    if (rq.country?.length > 0) {
                        const country = await getCountryByCode(rq.country)
                        if (country)
                            countryId = country.id
                    }

                    await tx.insert(postalAddress).values({
                        postalAddressId: postalAddressId, // Use the shared ID
                        phone: phone,
                        countryId: countryId,
                        city: rq.shipmentInformation.address?.city || null,
                        region: rq.shipmentInformation.address?.state || null,
                        name: rq.shipmentInformation.address.name.trim(),
                        surname: rq.shipmentInformation.address.surnames,
                        address: rq.shipmentInformation.address.address,
                        address2: rq.shipmentInformation.address.address2,
                        notifyWhatsApp: rq.notifyWhatsApp,
                        rut: rq.shipmentInformation.address.rut,
                        email: rq.customerInformation.email,
                        comment: rq.shipmentInformation.notes,
                        comunaId: rq.shipmentInformation.address.comuna?.id || null,
                        postalCode: rq.shipmentInformation.address.postalCode,
                        domainId: domainId
                    });

                }

                logger.info("drizzleDb.transaction 7")

                let facilityId: any = null
                if (rq.selectedCarrier === 9) {
                    facilityId = rq.pickupStore?.id || null;
                }

                // convert from CLP

                let desc = null
                let exchangeRate = 1


                if (currency !== "CLP" && rq.country !== "CL") {
                    const newRate = await convert(1, "CLP", currency)
                    const oldRate = rq.exchangeRate;

                    const percentChange = Math.abs(newRate - oldRate) / oldRate;

                    if (percentChange > 0.10) {
                        throw new Error("Tasa de cambio sufrio un cambio mayor a 10%")
                    }

                    exchangeRate = rq.exchangeRate;
                }

                const [orderResult] = await tx.insert(saleOrder).values({
                    orderDate: new Date(),
                    expectedDeliveryDate: new Date(),
                    comment: "",
                    exchangeRate: exchangeRate,
                    currency: currency,
                    shippedToId: postalAddressId, // Points to both tables via the shared ID
                    state: 1,
                    paymentMethodTypeId: rq.paymentMethod.gateway,
                    shipmentMethodTypeId: cart.shipmentMethod ? cart.shipmentMethod.id : null,
                    orderedBy: person.id,
                    destinationFacilityId: facilityId,
                    invoicedTo: organizacion.id, // todo datos de factura
                    domainId: domainId
                });

                const newOrderId = orderResult.insertId;
                //const pitMap = await getProductItemsMap(rq.items, domainId)

                let orderTotal = 0
                logger.info("drizzleDb.transaction 8")

                for (const item of cart.items) {


                    if (item.type === CartItemType.Product) {

                        validateRequestPrice(item, rq)

                        const pitDb = await drizzleDb.query.productItem.findFirst({
                            where: (productItem) => eq(productItem.id, item.product.productItemId)
                        });

                        item.product.id = pitDb.productId

                        let itemToInsert = createProductSaleOrderItem(
                            newOrderId, item, null, domainId, currency, exchangeRate)

                        const [orderItemResult] = await tx.insert(saleOrderItem).values(itemToInsert);
                        const orderItemId = orderItemResult.insertId;
                        if (item.packContents && item.packContents.length > 0) {
                            for (var packItem of item.packContents) {
                                const packItemDb =
                                    createProductSaleOrderItem(newOrderId, packItem, orderItemId, domainId, currency, exchangeRate)
                                await tx.insert(saleOrderItem).values(packItemDb);
                            }
                        }

                        orderTotal += item.quantity * item.price
                    } else if (item.type === CartItemType.Pack) {

                        // validate price
                        validateRequestPrice(item, rq)


                        for (const pitem of item.packContents) {
                            const packItemDb =
                                createProductSaleOrderItem(newOrderId, pitem, null, domainId, currency, exchangeRate)
                            await tx.insert(saleOrderItem).values(packItemDb);

                            orderTotal += pitem.quantity * pitem.price
                        }

                        // add discount of pack a separate line
                        if (item.packDiscount) {
                            orderTotal += item.packDiscount.price
                            await tx.insert(saleOrderItem).values({
                                orderId: newOrderId,
                                quantity: "1",
                                unitPrice: item.packDiscount.price,
                                unitCurrency: "CLP",
                                type: OrderItemType.Discount,
                                comment: item.packDiscount.name,
                            });
                        }

                    }
                }

                // todo should validate what is arriving
                if (cart.shipmentMethod.id !== ShipmentMethodType.StorePickup) {
                    const cost = rq.shipmentInformation?.cost || 0
                    const shippingCostItem =
                        createShippingCostItem(newOrderId, cost, domainId, currency, exchangeRate)
                    await tx.insert(saleOrderItem).values(shippingCostItem);

                    orderTotal += cost
                }

                if (appliedCoupon) {
                    const orderItemDb =
                        createCouponSaleOrderItem(newOrderId, appliedCoupon, currency, exchangeRate)
                    await tx.insert(saleOrderItem).values(orderItemDb);
                    orderTotal += (-1 * appliedCoupon.discount)
                }

                logger.info("drizzleDb.transaction 9: " + orderResult.insertId);

                return {id: orderResult.insertId, total: orderTotal, addressId: postalAddressId};
            } catch (txerro) {
                logger.error("CHECKOUT ERROR!!!!! " + txerro.message);
                logger.error("CHECKOUT ERROR!!!!! " + txerro.stack);
                throw txerro;
            }
        })

        // logger.error("drizzleDb.transaction result: " + JSON.stringify(result))
        res.json({
            id: result.id,
            total: ((!currency || currency === "CLP") ? Math.round(Number(result.total)) : result.total),
            addressId: result.addressId
        })
    } catch (err) {
        logger.error("CHECKOUT ERROR!!!!! " + err.message);
        logger.error("CHECKOUT ERROR!!!!! " + err.stack);

        next(err);
    }
})

router.get("/:domainId/checkout/payment-methods", async (req, res, next) => {
    try {

        const country = req.query.country || "CL"
        const rs = {gateways: []}
        if (country !== "CL") {

            if (country === "ES" || country === "US") {
                rs.gateways.push({
                    "id": 10,
                    "driver": "paypal",
                    "description": null,
                    "logo_class": "credit-cards",
                    "name": "paypal",
                    "order": 2
                })

            } else {
                rs.gateways.push({
                    "id": 19,
                    "driver": "dlocal",
                    "description": null,
                    "logo_class": "credit-cards",
                    "name": "dlocal",
                    "order": 1
                })

            }


            return res.json(rs);
        }


        res.json({
            "gateways": [
                {
                    "id": 8,
                    "driver": "webpay",
                    "description": null,
                    "logo_class": "credit-cards",
                    "name": "webpay",
                    "order": 1
                },
                {
                    "id": 15,
                    "driver": "mercadopago",
                    "description": null,
                    "logo_class": "mercadopago",
                    "name": "mercadopago",
                    "order": 2
                },
                /*                {
                                    "id": 19,
                                    "driver": "dlocal",
                                    "description": null,
                                    "logo_class": "credit-cards",
                                    "name": "dlocal",
                                    "order": 3
                                }*/
            ]
        })
    } catch (e) {
        next(e)
    }
})

router.post("/:domainId/checkout/delete-coupon", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const id = parseInt(req.body.id);
        const wuid = req.body.wuid

        const cart: Partial<Cart> = await findCart(wuid, domainId);

        await cartHelper.deleteCoupon(id, cart, domainId);

        await updateCart(cart)

        res.json(cart)
    } catch (e) {
        next(e)
    }
})

router.post("/:domainId/checkout/coupon", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const code = req.body.code.trim();
        const wuid = req.body.wuid

        const cart: Partial<Cart> = await findCart(wuid, domainId);

        const cartCoupon = await cartHelper.applyCoupon(code, cart, domainId);

        res.json({
            coupon: cartCoupon,
        })
    } catch (e) {
        next(e)
    }
})

router.get("/:domainId/checkout/click-collect", async (req, res, next) => {
    try {

        res.json({
            "stores": [
                {
                    "id": 1,
                    "title": "LAS TRANQUERAS (LAS CONDES)",
                    "name": "LAS TRANQUERAS",
                    "address": "LAS TRANQUERAS 56",
                    "latitude": -33400898749676832.0,
                    "longitude": -7055551688038699.0,
                    "comuna": {
                        "id": 316,
                        "name": "LAS CONDES"
                    }
                },
                {
                    "id": 3,
                    "title": "LIRA (SANTIAGO)",
                    "name": "LIRA",
                    "address": "LIRA 689",
                    "latitude": -334519330807735.0,
                    "longitude": -7064047278430553.0,
                    "comuna": {
                        "id": 344,
                        "name": "SANTIAGO"
                    }
                },
                {
                    "id": 4228,
                    "title": "ARGOMEDO (SANTIAGO)",
                    "name": "ARGOMEDO",
                    "address": "Lira 588",
                    "latitude": -334501501.0,
                    "longitude": -706407409.0,
                    "comuna": {
                        "id": 344,
                        "name": "SANTIAGO"
                    }
                },
                {
                    "id": 4597,
                    "title": "MX primer piso (LAS CONDES)",
                    "name": "MX primer piso",
                    "address": "Las Tranqueras 56, Primer Piso",
                    "latitude": -3340105625503981.0,
                    "longitude": -7055555322864296.0,
                    "comuna": {
                        "id": 316,
                        "name": "LAS CONDES"
                    }
                }
            ]
        })
    } catch (e) {
        next(e)
    }

})


function validateRequestPrice(item, rq) {
    const rqItem = rq.items.find(ri => ri.id === item.id)
    if (!rqItem)
        throw new Error(`Producto no esperado en carro compra: ${item.name}`)

    if (rqItem.price !== rqItem.price) {
        throw new Error(`Precio se modifico para item ${rqItem.name}`)
    }
}

function convertUnitPrice(price: number, currency: string, exchangeRate: number) {
    let unitPrice = price
    if (currency != "CLP")
        unitPrice = unitPrice / 1.19 * exchangeRate
    return unitPrice
}

function createProductSaleOrderItem(orderId, cartItem,
                                    orderItemId, domainId: number,
                                    currency: string, exchangeRate: number): Partial<SaleOrderItem> {


    return {
        orderId: orderId,
        productId: cartItem.product.id,            // Based on your mapping 'id' is the ProductId
        productItemId: cartItem.product.productItemId,
        quantity: cartItem.quantity.toString(), // Decimal columns expect strings in Drizzle/MySQL2
        unitPrice: convertUnitPrice(cartItem.price, currency, exchangeRate),
        unitCurrency: currency || "CLP",           // Default as per your table schema
        type: OrderItemType.Product,
        orderItemId: orderItemId ? orderItemId : null,
    }
}

function createShippingCostItem(orderId: number, cost: number, domainId: number, currency: string, exchangeRate: number): Partial<SaleOrderItem> {
    return {
        orderId: orderId,
        productId: null,
        productItemId: null,
        comment: "Costo de envío",
        quantity: "1",
        unitPrice: cost * exchangeRate, // valor es sin iva
        unitCurrency: currency,           // Default as per your table schema
        type: OrderItemType.Shipping,
        orderItemId: null,
    }
}

function createCouponSaleOrderItem(orderId: number, coupon: CartCoupon, currency: string, exchangeRate: number): Partial<SaleOrderItem> {

    return {
        orderId: orderId,
        productId: null,
        productItemId: null,
        couponId: coupon.id,
        comment: (coupon.name?.trim() + " " + coupon.description?.trim()).trim(),
        quantity: "1",
        unitPrice: convertUnitPrice(coupon.discount, currency, exchangeRate) * -1,
        unitCurrency: "CLP",           // Default as per your table schema
        type: OrderItemType.Coupon,
        orderItemId: null,
    }
}

function addBusinessDays(date, days) {
    if (days < 0) {
        throw new Error("days cannot be negative");
    }

    if (days === 0) return new Date(date);

    // Create a copy to avoid mutating the original date
    let result = new Date(date);

    // Sunday = 0, Monday = 1, ..., Saturday = 6
    if (result.getDay() === 6) { // Saturday
        result.setDate(result.getDate() + 2);
        days -= 1;
    } else if (result.getDay() === 0) { // Sunday
        result.setDate(result.getDate() + 1);
        days -= 1;
    }

    result.setDate(result.getDate() + Math.floor(days / 5) * 7);
    const extraDays = days % 5;

    if (result.getDay() + extraDays > 5) {
        result.setDate(result.getDate() + extraDays + 2);
    } else {
        result.setDate(result.getDate() + extraDays);
    }

    return result;
}

async function getPartyPartial(email, domainId) {
    const [result] = await drizzleDb
        .select({
            id: party.id,
            name: party.name,
            rut: party.rut
        })
        .from(party)
        .where(
            and(
                eq(party.email, email),
                eq(party.domainId, domainId)
            )
        )
        .limit(1);

    return result ?? null;
}

async function getCountryByCode(code: string) {
    const [result] = await drizzleDb
        .select({
            id: geographicBoundary.id,
            name: geographicBoundary.name,
        })
        .from(geographicBoundary)
        .where(
            and(
                like(geographicBoundary.code, code),
            )
        )
        .limit(1);

    return result ?? null;
}

async function getPartyPartialByRut(rut, domainId) {

    if (!rut) return null;

    const [result] = await drizzleDb
        .select({
            id: party.id,
            name: party.name,
            rut: party.rut
        })
        .from(party)
        .where(
            and(
                like(party.rut, rut),
                eq(party.domainId, domainId)
            )
        )
        .limit(1);

    return result ?? null;
}


export default router