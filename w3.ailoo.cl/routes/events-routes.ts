import {Router} from "express";

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


router.post('/:domainId/events/list', async (req, res, next): Promise<any> => {
    const domainId = req.params.domainId;
    try {
        let {startDate, endDate} = req.query;
        if (!startDate || !endDate) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            startDate = startDate || firstDay.toISOString();
            endDate = endDate || lastDay.toISOString();
        }

        const result = await getElClient().search({
            index: 'events',
            body: {
                query: {
                    bool: {
                        must: [{
                            range: {
                                startDate: {
                                    gte: startDate,
                                    lte: endDate
                                }
                            }
                        }, {
                            term: {domainId: domainId,}
                        }
                        ]
                    }
                },
                sort: [
                    {startDate: {order: 'desc'}}
                ],
                size: 500 // Adjust this value based on your needs
            }
        });

        const events = result.hits.hits.map(hit => ({
            id: hit._id,
            ...hit._source
        }));

        res.json(events);
    } catch (e) {
        next(e);
    }
})


export default router;