import { Router } from "express";
import {deleteRedisProductCache} from "../../utils/cache-utils.js";

const router = Router();


router.get("/:domainId/refresh", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const rsProds = await deleteRedisProductCache(domainId)

        res.json({
            productCache: rsProds,
        })
    }catch(e){
        next(e)
    }
});

export default router;