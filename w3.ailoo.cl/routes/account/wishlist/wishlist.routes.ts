import {validateJWT} from "../../../server.js";
import {Router} from "express";
import {db as drizzleDb} from "../../../db/drizzle.js";

import {and, eq, isNull, sql} from "drizzle-orm";
import schema from "../../../db/schema.js";

const { wishListItem} = schema



const router = Router(); // Create a router instead of using 'app'

router.post("/:domainId/wishlist/sync", validateJWT, async (req, res, next) => {

    res.json({})
});

router.get("/:domainId/wishlist/add", validateJWT, async (req, res, next) => {
    try{
        const domainId = parseInt(req.params.domainId);
        const productIds = req.body.productIds;
        const userId = req.user.id;



        const user = await drizzleDb.query.user.findFirst({
            where: (user) => eq(user.id, userId),
        });

        for(const prodId of productIds) {
            const [result] = await drizzleDb.insert(schema.wishListItem).values({
                productId: Number(prodId),
                partyId: user.personId,
                domainId: domainId,
                addedDate: new Date(),
                quantity: 1,
            })
        }

        res.json({  });
    }catch(e){
        next(e)
    }
})

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


export default router