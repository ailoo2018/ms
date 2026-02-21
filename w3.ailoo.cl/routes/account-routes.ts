import {Router} from "express";
import {reviewsUpload, validateJWT} from "../server.js";
import {listPartyPostalAddresses} from "../db/partyDb.js";
import * as ProductHelper from "../helpers/product-helper.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {and, asc, desc, eq, ne} from "drizzle-orm";
import schema from "../db/schema.js";

const {geographicBoundary, postalAddress, review, saleOrder, contactMechanism, partyContactMechanism} = schema
import {partyReviews} from "../db/reviews.js";
import container from "../container/index.js";
import {uploadImagesAilooCDN} from "../services/cdnService.js";
import ProductImageHelper from "@ailoo/shared-libs/helpers/ProductImageHelper";
import {getProductImage} from "../helpers/product-helper.js";
import {ordersHelper} from "../helpers/order-helper.js";
import {findOrder} from "../services/ordersService.js";

const router = Router();
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


router.get("/:domainId/account/latest-orders", validateJWT, async (req, res, next) => {
    try {
        const userReq = req.user;

        const userDb = await drizzleDb.query.user.findFirst({
            where: (user, {eq, and}) => {
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
                for (var oi of r.items) {

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

                    orderProducts.push({
                        id: product.id,
                        name: product.name,
                        brand: product.brand,
                        description: ProductHelper.getProductItemDescription(product, productItem),
                        productItemId: productItem.id,
                        image: image?.image || null,
                        quantity: oi.quantity,
                    })
                }
                return {
                    id: r.id,
                    date: r.orderDate,
                    total: 0,
                    statusId: r.state,
                    status: OrderStateDesc["" + r.state] ? OrderStateDesc["" + r.state] : "Desconocido",
                    products: orderProducts,

                }
            })
        })
    } catch (err) {
        next(err);
    }
});

router.delete("/:domainId/account/addresses/:id", validateJWT, async (req, res, next) => {
    try {
        const {domainId, id} = req.params;
        const addressId = parseInt(id);

        await drizzleDb.delete(postalAddress)
            .where(eq(postalAddress.postalAddressId, addressId));

        res.json({})
    } catch (e) {
        next(e)
    }
})

router.get("/:domainId/account/addresses/:id/default", validateJWT, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.id

        const userDb = await drizzleDb.query.user.findFirst({
            where: (user, {eq }) => eq(user.id, req.user.id),
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

router.post("/:domainId/account/addresses/:id", validateJWT, async (req, res, next) => {
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

            const [result] = await drizzleDb.insert(postalAddress).values({
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
        const domainId = parseInt(req.params.domainId)

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

        const addresses: any = await listPartyPostalAddresses(user.partyId)

        res.json({
            addresses: addresses.map(addr => {

                const nameObj = parseFullName(addr.Name);

                return {
                    "id": addr.PostalAddressId,
                    "default": !!addr.IsDefault,
                    "comuna_id": addr.ComunaId || 0,
                    "address": addr.Address || null,
                    "phone": addr.Phone || null,
                    "nif": addr.Rut || null,
                    "name": nameObj.firstName,
                    "surnames": nameObj.paternalSurname,
                    "postal_code": addr.PostalCode || null,
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

router.get("/:domainId/account/user", validateJWT, async (req, res, next) => {
    try {
        const userId = req.user.id;

        const user = await drizzleDb.query.user.findFirst({
            where: (user, {eq}) => eq(user.id, userId),
            // Use 'with' if you need the linked Party (Person) data too
            with: {
                person: true
            }
        });

        res.json({
            id: user.id,
            username: user.username,
            person: user.person,
        })
    } catch (err) {
        next(err);
    }
})

router.get("/:domainId/account/reviews", validateJWT, async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const userId = req.user.id;

        const userDb = await drizzleDb.query.user.findFirst({
            where: (user, {eq}) => eq(user.id, userId),
            with: {
                person: true
            }
        })

        const rows: any = await partyReviews(userDb.personId, domainId)


        const productService = container.resolve('productsService');
        var products = await productService.findProducts(rows.map(r => r.ProductId), domainId)

        res.json({
            reviews: rows.map(r => {
                const product = products.find(p => r.ProductId === p.id)

                return {
                    product: product || null,
                    invoiceId: r.InvoiceId,
                    productItemId: r.Id,

                }
            })
        })

    } catch (e) {
        next(e)
    }
})

router.post("/:domainId/account/reviews/add", validateJWT, reviewsUpload,
    async (req, res, next) => {
        try {
            const {domainId} = req.params;
            const {productItemId, productId, rating, title, comment, videoUrl, invoiceId} = req.body;
            const userId = req.user.id

            // Validation
            if (!productItemId && !productId) {
                return res.status(400).json({
                    error: 'Product item ID is required'
                });
            }

            if (!rating || rating < 0 || rating > 5) {
                return res.status(400).json({
                    error: 'Valid rating (0-5) is required'
                });
            }

            if (!title || title.trim() === '') {
                return res.status(400).json({
                    error: 'Review title is required'
                });
            }

            if (!comment || comment.trim() === '') {
                return res.status(400).json({
                    error: 'Review comment is required'
                });
            }

            let product

            if (productItemId)
                product = await productService.findProductByProductItem(parseInt(productItemId), domainId)
            else
                product = await productService.findProduct(parseInt(productId), domainId)

            // Process uploaded images from memory buffer
            const uploadedImages = req.files && req.files.images ? req.files.images.map(file => ({
                fieldname: file.fieldname,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                buffer: file.buffer, // The actual file data in memory
                encoding: file.encoding
            })) : [];


            let cdnResp = null;
            if (uploadedImages.length > 0) {
                cdnResp = await uploadImagesAilooCDN(uploadedImages, domainId);
            }

            const userDb = await drizzleDb.query.user.findFirst({
                where: (user, {eq}) => eq(user.id, userId),
                with: {
                    person: true
                }
            })

            var name = ""
            if (userDb.person)
                name = userDb.person.firstName

            var location = ""
            if (invoiceId) {
                var orderDb = await drizzleDb.query.saleOrder.findFirst({
                    where: (saleOrder, {eq}) => eq(saleOrder.invoiceId, parseInt(invoiceId)),
                })


                if (orderDb && orderDb.shippedToId > 0) {
                    const addresses = await drizzleDb.select()
                        .from(postalAddress)
                        .leftJoin(
                            geographicBoundary,
                            eq(postalAddress.comunaId, geographicBoundary.id)
                        )
                        .where(eq(postalAddress.postalAddressId, orderDb.shippedToId))
                        .limit(1)

                    if (addresses.length > 0 && addresses[0].geographicboundary) {
                        const geo = addresses[0].geographicboundary
                        if (geo)
                            location = geo.name
                    }
                }
            }

            const [result] = await drizzleDb.insert(review).values({
                rating: rating * 2,           // e.g., 5
                title: title,             // e.g., "Excellent Helmet!"
                name: name,           // e.g., "Diego Rosas"
                location: location,           // e.g., "Santiago"
                comments: comment,        // e.g., "Very comfortable at high speeds."
                date: new Date(),              // Current timestamp
                productId: product.id,     // The product being reviewed
                userId: userId,   // Optional: Link to a registered user
                domainId: domainId,                   // Your current domain
                model: cdnResp ? JSON.stringify(
                    {
                        images: cdnResp.uploads.map(u => {
                            return {id: u.imageId}
                        })
                    }) : null
            });

            console.log("Review created with ID:", result.insertId);
            const reviewId = result.insertId;


            res.json({
                reviewId: reviewId,
                uploads: cdnResp,
                images: uploadedImages.map(ui => {
                    return {
                        originalName: ui.originalName,
                        size: ui.size,
                        encoding: ui.encoding,
                        mimetype: ui.mimetype
                    };
                }),
            })
        } catch (e) {
            next(e)
        }
    })

export default router