import {reviewsUpload, validateJWT} from "../../../server.js";
import {db as drizzleDb} from "../../../db/drizzle.js";
import {partyPendingReviews, partyReviewed, partyReviews} from "../../../db/reviews.js";
import container from "../../../container/index.js";
import {uploadImagesAilooCDN} from "../../../services/cdnService.js";
import router from "../../account-routes.js";
import {and, asc, desc, eq, ne} from "drizzle-orm";
import schema from "../../../db/schema.js";


const {
    geographicBoundary,
    postalAddress,
    review,
    saleOrder,
    contactMechanism,
    partyContactMechanism,
    user,
    product,
    invoice,
    invoiceItem,
    party
} = schema

const productService = container.resolve('productsService');

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

        const rows: any = await partyPendingReviews(userDb.personId, domainId)

        const reviewsRows: any = await partyReviewed(userDb.personId, domainId)


        const pendingProducts = rows.map(r => r.ProductId)
        const reviewedProducts = reviewsRows.map(r => r.ProductId)


        const productService = container.resolve('productsService');
        var products = await productService.findProducts([...pendingProducts, ...reviewedProducts], domainId)

        res.json({
            reviewed: reviewsRows.filter(r1 => products.find(p => r1.ProductId === p.id)).map(r => {
                const product = products.find(p => r.ProductId === p.id)

                return {
                    product: product ? {
                        id: product.id,
                        name: product.name,
                        fullName: product.fullName,
                        minPrice: product.minPrice,
                        image: product.image,
                        brand: product.brand,
                        parentCategories: product.parentCategories
                    } : null,
                    invoiceId: r.InvoiceId,
                    invoiceDate: r.InvoiceDate,
                    invoiceNumber: r.InvoiceNumber,
                    price: r.Price,
                    invoiceType: r.InvoiceType,
                    productItemId: r.Id,
                    review: {
                        id: r.Id,
                        title: r.Title,
                        body: r.Comments,
                        date: r.Date,
                        rating: r.Rating,
                        likes: r.Likes,
                        dislikes: r.Dislikes,
                        pros: null,
                        cons: null,
                    }
                }
            }),
            pending: rows.filter(r1 => products.find(p => r1.ProductId === p.id)).map(r => {
                const product = products.find(p => r.ProductId === p.id)

                return {
                    id: product.id,
                    product: product ? {
                        id: product.id,
                        name: product.name,
                        fullName: product.fullName,
                        minPrice: product.minPrice,
                        image: product.image,
                        brand: product.brand,
                        parentCategories: product.parentCategories
                    } : null,
                    invoiceId: r.InvoiceId,
                    invoiceDate: r.InvoiceDate,
                    invoiceNumber: r.InvoiceNumber,
                    price: r.Price,
                    invoiceType: r.InvoiceType,
                    productItemId: r.ProductItemId,

                }
            })
        })

    } catch (e) {
        next(e)
    }
})

router.post("/:domainId/account/reviews/add", validateJWT, reviewsUpload,    async (req, res, next) => {
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