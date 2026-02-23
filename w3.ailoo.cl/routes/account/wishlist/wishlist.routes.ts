import {validateJWT} from "../../../server.js";
import {Router} from "express";
import {db as drizzleDb} from "../../../db/drizzle.js";

import {and, eq, isNull, sql} from "drizzle-orm";
import schema from "../../../db/schema.js";
import {getSymmetricDifference} from "../../../utils/utils.js";
import container from "../../../container/index.js";

const { wishListItem} = schema



const router = Router(); // Create a router instead of using 'app'


router.get("/:domainId/wishlist", validateJWT, async (req, res, next) => {
    try{
        const domainId = parseInt(req.params.domainId);
        const partyId = req.user.partyId

        const rows = await drizzleDb.select({
            productId: schema.wishListItem.productId
        }).from(schema.wishListItem).where(
            and(
                eq(schema.wishListItem.partyId, partyId )
            )
        )
        const productIds = rows.map(r => r.productId)
        const productService = container.resolve('productsService');
        const products = await productService.findProducts(productIds, domainId)

        res.json({
            products: products
        })
    }catch(e){
        next(e)
    }
})


router.post("/:domainId/wishlist/sync", validateJWT, async (req, res, next) => {

    try{
        const domainId = parseInt(req.params.domainId);
        const { productIds} = req.body;
        const partyId = req.user.partyId

        const results = await drizzleDb.select({
            productId: schema.wishListItem.productId,
        }).from(wishListItem).where(and(
            eq(schema.wishListItem.partyId, partyId)
        ))

        let productIdsDb = results.map(r => r.productId)

        let setDb = new Set(productIdsDb)
        const idsList1NotList2 =  productIds.filter(x => !setDb.has(x));

        for(const prodId of idsList1NotList2) {
            const [result] = await drizzleDb.insert(schema.wishListItem).values({
                productId: Number(prodId),
                partyId: partyId,
                domainId: domainId,
                addedDate: new Date(),
                quantity: 1,
            })
        }

        res.json({
            productIds: [...productIdsDb, ...idsList1NotList2],
        })
    }catch(e){
        next(e)
    }


});

router.get("/:domainId/wishlist/toggle/:productId", validateJWT, async (req, res, next) => {
    try{
        const domainId = parseInt(req.params.domainId);
        const productId = parseInt(req.params.productId);
        const partyId = req.user.partyId


        const result = await drizzleDb.query.wishListItem.findFirst({
            where: (wishListItem, {and, eq}) => {
                return and(
                    eq(wishListItem.productId, productId),
                    eq(wishListItem.partyId, partyId)
                )
            }
        })

        let isDeleted = false
        if(!result){
            await drizzleDb.insert(schema.wishListItem).values({
                productId: productId,
                partyId: partyId,
                domainId: domainId,
                addedDate: new Date(),
                quantity: 1,
            })
        }else{
            // delete by productId and partyId

            await drizzleDb.delete(schema.wishListItem)
                .where(
                    and(
                        eq(schema.wishListItem.productId, productId),
                        eq(schema.wishListItem.partyId, partyId)
                    )
                );
            isDeleted = true;
        }


        res.json({ isDeleted, productId, partyId });
    }catch(e){
        next(e)
    }
})

/*
router.get("/:domainId/wishlist", validateJWT, async (req, res, next) => {
    try{
        const domainId = parseInt(req.params.domainId);
        const userId = req.user.id;

        const user = await drizzleDb.query.user.findFirst({
            where: (user) => eq(user.id, userId),
        });

        const items = await drizzleDb.select({
            id: schema.wishListItem.id
        }).from(wishListItem).where(
            and(
                eq(schema.wishListItem.partyId, user.personId),
                isNull(schema.wishListItem.wishListId)
            )
        )

        res.json({ items: items });
    }catch(e){
        next(e)
    }
})
*/


export default router