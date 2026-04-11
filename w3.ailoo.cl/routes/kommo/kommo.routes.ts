import router from "../events-routes.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import {findLatestLeadByContact, findLeadByEmail, findLeadByPhone, getUserDetails} from "../../models/kommo.types.js";
import {notifySalesPerson, notifySalesPersonByInvoice} from "../../services/ordersService.js";
import {and, eq, gt, inArray} from "drizzle-orm";
import schema from "../../db/schema.js";

const {  saleOrder } = schema


router.get('/:domainId/kommo/validate-leads', async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const invoiceId = parseInt(req.query.invoiceId);

        const ret = await notifySalesPersonByInvoice(invoiceId, domainId)

        res.json({status: ret})
    } catch (err) {
        next(err)
    }
})

router.get('/:domainId/kommo/notify-lead-close', async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const orderId = parseInt(req.query.orderId);

        const ret = await notifySalesPerson(orderId, domainId)

        res.json({status: ret})
    } catch (err) {

    }
})


router.get('/:domainId/kommo/find-lead', async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const {phone, email} = req.query;

        const leads = await findLatestLeadByContact({email, phone})


        res.json(leads);
    } catch (err) {
        next(err);
    }

});

router.get('/:domainId/kommo/check-past-sales', async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const daysAgo = parseInt(req.query.daysAgo || 10);

        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - daysAgo);


        const orders = await drizzleDb.select({
            id: saleOrder.id,
        }).from(saleOrder).where(and(
            gt(saleOrder.orderDate, tenDaysAgo),
            inArray(saleOrder.state, [2,3,8,10,15]),
            eq(saleOrder.domainId,  domainId),
        ))

        const result = []

        for(const order of orders){
            if(order.id === 195219)
                continue;
            const n = await notifySalesPerson(order.id, domainId)
            result.push({ orderId: order.id, status: n.status, lead: n.lead || null})
        }


        res.json(result);
    } catch (err) {
        next(err);
    }

});


export default router;