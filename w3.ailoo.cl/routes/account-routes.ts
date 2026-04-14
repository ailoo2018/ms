import {Router} from "express";
import { validateJWT} from "../server.js";
import {listAddressesByOrders, listPartyPostalAddresses} from "../db/partyDb.js";
import * as ProductHelper from "../helpers/product-helper.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {and,  eq, ne} from "drizzle-orm";

import container from "../container/index.js";
import {getProductImage} from "../helpers/product-helper.js";
import {findOrder} from "../services/ordersService.js";
const router = Router();

import schema from "../db/schema.js";

const { postalAddress,  saleOrder, contactMechanism, partyContactMechanism } = schema



const productService = container.resolve('productsService');
const parseFullName = (fullName) => {
    // Handle null, undefined, or empty/whitespace input
    if (!fullName || !fullName.trim()) {
        return {
            firstName: "",
            paternalSurname: "",
            maternalSurname: ""
        };
    }

    // Split by whitespace and remove empty entries
    const nameParts = fullName.trim().split(/\s+/);

    // Case 1: Single word name
    if (nameParts.length === 1) {
        return {
            firstName: nameParts[0],
            paternalSurname: "",
            maternalSurname: ""
        };
    }

    // Case 2: 4 or more parts (Hispanic names)
    // First name is everything except the last two parts
    if (nameParts.length >= 4) {
        return {
            firstName: nameParts.slice(0, -2).join(" "),
            paternalSurname: nameParts[nameParts.length - 2],
            maternalSurname: nameParts[nameParts.length - 1]
        };
    }

    // Case 3: 3 parts (e.g., "Juan Carlos Fuentes")
    if (nameParts.length === 3) {
        return {
            firstName: nameParts.slice(0, 2).join(" "),
            paternalSurname: nameParts[2],
            maternalSurname: ""
        };
    }

    // Case 4: 2 parts (First Name + Paternal Surname)
    return {
        firstName: nameParts[0],
        paternalSurname: nameParts[1],
        maternalSurname: ""
    };
};

const OrderStateDesc = {
    "0": "Desconocido",
    "1": "Ingresado",
    "2": "Pagado",
    "3": "Enviado",
    "4": "Anulado",
    "5": "Pendiente Pago",
    "6": "Abierto",
    "7": "Rechazado",
    "8": "Listo Para Retiro",
    "9": "Retirado",
    "10": "Entregado",
    "11": "Error Pago",
    "12": "Listo para enviar",
    "13": "Comentario",
    "14": "Derivado a SAC",
    "15": "En proceso",
}

router.get("/:domainId/account/orders/:id", validateJWT, async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const orderId = parseInt(req.params.id);

        const order = await findOrder(orderId, domainId)


        res.json(order)
    } catch (e) {
        next(e)
    }
})


const shippingMethods = new Map<number, string>([
    [1, "Correos de Chile"],
    [2, "Starken"],
    [3, "Starken Por Pagar"],
    [4, "Envíos Dentro De Santiago"],
    [5, "Chilexpress"],
    [6, "UPS Worldwide Expedited"],
    [7, "Blue Express"],
    [8, "Envío Gratuito"],
    [9, "Retiro en Tienda"],
    [10, "TNT"],
    [11, "DHL"],
    [12, "MuvSmart"],
    [13, "Alas Express"],
    [14, "Envio propio"],
]);

router.get("/:domainId/account/latest-orders", validateJWT, async (req : any, res : any, next : any) => {
    try {
        const userReq = req.user;

        const userDb = await drizzleDb.query.user.findFirst({
            where: (user, { eq }) => {
                return eq(user.id, userReq.id)
            },
            with: {
                person: true,
            }
        })

        const domainId = parseInt(req.params.domainId);
        const results: any = await drizzleDb.query.saleOrder.findMany({
            limit: 10,
            offset: 0,
            where: and(
                eq(saleOrder.orderedBy, userDb.person?.id || 0),
                eq(saleOrder.domainId, domainId),
                ne(saleOrder.state, 1)
            )
            ,
            orderBy: (saleOrder, {desc}) => [desc(saleOrder.id)],
            with: {
                items: true, // This matches the 'items' key in your saleOrderRelations
            },
        });

        const pitIds = []
        for (var o of results) {
            for (var oi of o.items) {
                if (oi.productItemId > 0)
                    pitIds.push(oi.productItemId)
            }
        }


        const products = await productService.findProductsByProductItems(pitIds, domainId)

        res.json({
            orders: results.map(r => {
                const orderProducts = []
                let total = 0;
                for (const oi of r.items) {

                    if (!oi.productItemId)
                        continue

                    var product = products.find(p => p.productItems.some(pit => {
                        return pit.id === oi.productItemId
                    }))
                    if (!product)
                        continue

                    var productItem = product.productItems.find(pit => pit.id === oi.productItemId)
                    if (!productItem)
                        continue

                    var image = getProductImage(product, productItem)
                    total = parseInt(oi.quantity) * oi.unitPrice

                    orderProducts.push({
                        id: product.id,
                        name: product.name,
                        fullName: product.fullName,
                        brand: product.brand,
                        description: ProductHelper.getProductItemDescription(product, productItem),
                        productItemId: productItem.id,
                        image: image?.image || null,
                        quantity: oi.quantity,
                        product: {
                            id: product.id,
                            fullName: product.fullName,
                            image: product.image,
                            brand: product.brand && {
                                id: product.brand.id,
                                name: product.brand.name,
                                logo: product.brand.logo
                            }
                        },
                    })
                }
                return {
                    id: r.id,
                    number: r.id,
                    documentDate: r.orderDate,
                    shipmentMethodType: getShippingMethod( r.shipmentMethodTypeId ),
                    date: r.orderDate,
                    total: total,
                    netTotal: total / 1.19,
                    iva: (total - total / 1.19),
                    statusId: r.state,
                    status: OrderStateDesc["" + r.state] ? OrderStateDesc["" + r.state] : "Desconocido",
                    productItems: orderProducts,

                }
            })
        })
    } catch (err) {
        next(err);
    }
});

function getShippingMethod(type){
    if(shippingMethods.has(type))
        return shippingMethods.get(type);
    return "Desconocido";
}


router.delete("/:domainId/account/addresses/:id", validateJWT, async (req, res, next) => {
    try {
        const { id} = req.params;
        const addressId = parseInt(id);

        await drizzleDb.delete(postalAddress)
            .where(eq(postalAddress.postalAddressId, addressId));

        res.json({})
    } catch (e) {
        next(e)
    }
})

router.get("/:domainId/account/addresses/:id/default", validateJWT, async (req : any, res : any, next : any) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.id

        const userDb = await drizzleDb.query.user.findFirst({
            where: (user, {eq }) => eq(user.id, userId),
            with: {
                person: {
                    with:  { contactMechanisms: true }
                }
            }
        })

        if(userDb?.person?.contactMechanisms){
            for(var cm of userDb.person.contactMechanisms){

                let isDefault = cm.contactMechanismId === id

                await drizzleDb.update(partyContactMechanism).set({
                    isDefault: isDefault ? 1 : 0,
                }).where(eq(partyContactMechanism.id, cm.id))
            }
        }


        res.json({})
    } catch (e) {
        next(e)
    }
})

router.post("/:domainId/account/addresses/:id", validateJWT, async (req  : any, res  : any, next  : any) => {
    try {
        const {domainId, id} = req.params;
        const rq = req.body;
        const addressId = parseInt(id);

        const userDb = await drizzleDb.query.user.findFirst({
            where: (user, {eq}) => eq(user.id, req.user.id),
            with: {
                person: true
            }
        })

        let party = userDb.person

        const data = {
            address: rq.address,
            address2: rq.address2,
            commune: rq.comuna?.name,
            comunaId: rq.comuna?.id,
            name: rq.fname,
            surname: rq.lname,
            phone: rq.phone,
            rut: rq.rut,
            postalCode: rq.postalCode,
            latitude: rq.comuna?.latitude?.toString(),
            longitude: rq.comuna?.longitude?.toString(),
            alias: rq.alias,
            domainId: parseInt(domainId),
            // Add other fields as necessary
        };

        let finalId = addressId;

        if (addressId === 0) {
            // MySQL INSERT
            const [cmResult] = await drizzleDb.insert(contactMechanism).values({});
            finalId = cmResult.insertId;

            await drizzleDb.insert(postalAddress).values({
                ...data,
                createDate: new Date(),
                // If postalAddressId is NOT autoincrement, use rq.id or a generator
                postalAddressId: finalId
            });

            // add address to party contact mechanism
            const [result2] = await drizzleDb.insert(partyContactMechanism).values({
                partyId: party.id,
                contactMechanismId: finalId,
                fromDate: new Date(),
            });

            console.log("result2: " + result2);
        } else {
            // MySQL UPDATE
            await drizzleDb.update(postalAddress)
                .set(data)
                .where(eq(postalAddress.postalAddressId, addressId));
        }

        // Fetch the record to return it to the frontend
        const updatedAddress = await drizzleDb.select()
            .from(postalAddress)
            .where(eq(postalAddress.postalAddressId, finalId))
            .limit(1);

        res.json(updatedAddress[0] || {success: true});

    } catch (e) {
        console.error(e);
        next(e);
    }
})

router.get("/:domainId/account/addresses/:id", validateJWT, async (req, res, next) => {
    try {

        const id = parseInt(req.params.id)
        // const domainId = parseInt(req.params.domainId)

        const address = await drizzleDb.query.postalAddress.findFirst({
            where: (postalAddress, {eq}) => {
                return eq(postalAddress.postalAddressId, id)
            },
            with: {
                comuna: true,
                country: true,
            }
        })

        res.json({

            "id": address.postalAddressId,
            "alias": address.alias,
            "fname": address.name,
            "lname": address.surname,
            "address": address.address,
            "address2": address.address2,
            "comuna": address.comuna,
            "phone": address.phone,
            "postalCode": address.postalCode,
            "county": address.country,
            "rut": address.rut,
        })
    } catch (e) {
        next(e)
    }
})

router.get("/:domainId/account/addresses", validateJWT, async (req, res, next) => {

    try {
        const user = req.user;


        const party = await drizzleDb.query.party.findFirst({
            where: (party, {eq}) => eq(party.id, req.user.partyId),
        })

        let addresses: any = await listPartyPostalAddresses(user.partyId)

        if(addresses.length === 0) {
            addresses = await listAddressesByOrders(user.partyId)
        }

        res.json({
            addresses: addresses.map(addr => {

                const nameObj = parseFullName(addr.Name || party?.name);

                return {
                    "id": addr.PostalAddressId,
                    "default": !!addr.IsDefault,
                    "comunaId": addr.ComunaId || 0,
                    "country": addr.CountryCode?.toUpperCase() || "CL",
                    "address": addr.Address || null,
                    "phone": addr.Phone || null,
                    "nif": addr.Rut || null,
                    "name": nameObj.firstName,
                    "surnames": nameObj.paternalSurname,
                    "postalCode": addr.PostalCode || null,
                    "address2": addr.Address2 || null,
                    "alias": addr.Alias || null,
                    "type": "shipping",
                    "comuna": {
                        "id": addr.ComunaId,
                        "name": addr.ComunaName,
                    },
                    "rut": addr.Rut || null,
                }
            }),
        });
    } catch (err) {
        next(err)
    }

})


export default router