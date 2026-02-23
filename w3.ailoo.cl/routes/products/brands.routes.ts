import {Router} from "express";
import {validateJWT} from "../../server.js";
import {getElClient, getIndexName} from "../../connections/el.js";
import {db as redisDb} from "../../connections/rdb.js";
import {brandsCacheKey, productCacheKey} from "../../utils/cache-utils.js";

const router = Router(); // Create a router instead of using 'app'


const CACHE_TTL = 60 * 60 * 1; // 1 hours in seconds

router.get("/:domainId/brands", async (req, res, next) => {
    try{
        const domainId = parseInt(req.params.domainId);

        const cachedData = await redisDb.get(brandsCacheKey(domainId));
        if (cachedData) {
            return res.json({ fromCache: true, brands: JSON.parse(cachedData.toString()) } );
        }


        const result = await getElClient().search({
            index: getIndexName(domainId),
            query: {
                bool: {
                    must: [
                        {term: {domainId: domainId}},
                        {term: {isAvailableForInternet: true}},
                        {range: {minPrice: {gt: 0}}},
                        {range: {universalQuantity: {gt: 0}}},
                    ]
                }
            },
            size: 0,
            "aggs": {
                "brands_count": {
                    "terms": {
                        "field": "brand.id",
                        "size": 500
                    },
                    "aggs": {
                        "thit" : {
                            "top_hits": {
                                "size": 1,
                                "_source": {
                                    "includes" : ["brand.id", "brand.name"]
                                }
                            }
                        }
                    }
                }
            },
        })

        const brands = result.aggregations.brands_count.buckets.map( b => {
            return {...b.thit.hits.hits[0]._source.brand, count: b.doc_count }
        }).sort((a, b) => a.name.localeCompare(b.name))

        await redisDb.set(brandsCacheKey(domainId), JSON.stringify(brands), {
            EX: CACHE_TTL
        });

        res.json({
            fromCache: false,
            brands: brands,
        })
    }catch(e){
        next(e)
    }
})

export default router