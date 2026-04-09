import router from "../events-routes.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import {findLatestLeadByContact, findLeadByEmail, findLeadByPhone, getUserDetails} from "../../models/kommo.types.js";
import {notifySalesPerson} from "../../services/ordersService.js";


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

export default router;