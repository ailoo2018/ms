import {validateJWT} from "../../../server.js";
import {Router} from "express";
import {db as drizzleDb} from "../../../db/drizzle.js";

import {and, eq, isNull, sql} from "drizzle-orm";
import schema from "../../../db/schema.js";
import {getSymmetricDifference} from "../../../utils/utils.js";
import container from "../../../container/index.js";

const { wishListItem} = schema



const router = Router(); // Create a router instead of using 'app'

router.get("/:domainId/invite-a-friend/create-coupon", validateJWT, async (req, res, next) => {
    try{

    }catch(e){
        next(e)
    }
})



export default router