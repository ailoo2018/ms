import cmsClient from "../../services/cmsClient.js";
import router from "../events-routes.js";
import {getElClient, getIndexName} from "../../connections/el.js";
import * as ProductHelper from "../../helpers/product-helper.js";

router.get('/:domainId/sitemap', async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId);

        var response = await getElClient().search({
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
            _source: {
                includes: [ "id", "linkName", "fullName", "createDate", "modifiedDate" ]
            },
            from: 0,
            size: 10000,

        })

        var productsUrls = response.hits.hits.map(h => {

            try {
                var p = h._source

                let lastmod = null;
                if (p.modifiedDate)
                    lastmod = new Date(p.modifiedDate).toISOString()
                else
                    lastmod = new Date(p.createDate).toISOString()

                return {
                    loc: ProductHelper.getLink(p),
                    lastmod: lastmod,
                    changefreq: 'weekly',
                    priority: 0.8
                }
            }catch(e){
                console.log("Error: ", e)
                return {
                    loc: ProductHelper.getLink(p),
                    lastmod: new Date().toISOString(),
                    changefreq: 'weekly',
                    priority: 0.8
                }

            }

        })

        console.log("Total product links: " + productsUrls.length)

        res.json(productsUrls)
    } catch (err) {
        next(err)
    }

});

export default router;