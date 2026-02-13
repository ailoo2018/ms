import {Router} from "express";
import logger from "@ailoo/shared-libs/logger";
const router = Router(); // Create a router instead of using 'app'
import cmsClient from "../services/cmsClient.js";
import {getElClient} from "../connections/el.js";


router.get('/:domainId/events/latest', async (req, res, next) => {

    try {
        let limit = 10;
        if (req.query.limit)
            limit = parseInt(req.query.limit);

        const domainId = parseInt(req.params.domainId);


        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const evRs = await cmsClient.searchEvents({
            limit: limit,
            from: today.toISOString(),
            status: "Approved"

        }, domainId)


        res.json(evRs)
    } catch (err) {
        next(err)
    }

});


// this is a change
router.post('/:domainId/events/list', async (req, res, next): Promise<any> => {
    const domainId = req.params.domainId;
    try {
        let {from, to, limit, offset} = req.body;

        logger.info("CALLED events/list: ", {from, to, limit, offset})

        limit = limit || 10
        offset = offset || 0;

        if (from)
            from = new Date(from.substring(0, 10))

        if (!from || !to) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 10, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 10, 0);

            from = from || firstDay.toISOString();
            to = to || lastDay.toISOString();
        }

        let body =  {
            query: {
                bool: {
                    must: [{
                        range: {
                            startDate: {
                                gte: from,
                                lte: to
                            }
                        }
                    }, {
                        term: {domainId: domainId,}
                    }
                    ]
                }
            },
            sort: [
                {startDate: {order: 'asc'}}
            ],
            from: offset,
            size: limit ,
        }

        logger.info("el search events: " + JSON.stringify(body))
        const result = await getElClient().search({
            index: 'events',
            body: body
        });

        const events = result.hits.hits.map(hit => {
            let ev = {
                id: hit._id,
                ...hit._source
            }

            ev.endDate = ev.startDate

            return ev;
        });

        res.json({
            totalCount: result.hits.total.value,
            events: events ,
        });
    } catch (e) {
        logger.error("error events/list: " + e.message)
        next(e);
    }
})


export default router;