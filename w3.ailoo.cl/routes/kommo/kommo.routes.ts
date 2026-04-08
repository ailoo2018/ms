import router from "../events-routes.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import {findLeadByPhone, getUserDetails} from "../../models/kommo.types.js";
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
        const {phone} = req.query;

        const leads = await findLeadByPhone(phone)

        if (leads.length == 0) {
            return res.json({})
        }

        let kommoUser = null
        let lead = leads[0];

        if (lead.responsible_user_id > 0)
            kommoUser = await getUserDetails(lead.responsible_user_id)


        let ailooUser = null
        if (kommoUser) {
            ailooUser = await drizzleDb.query.user.findFirst({
                where: (user, {eq, and}) => {
                    return and(
                        eq(user.email, kommoUser.email),
                        eq(user.domainId, domainId))
                }
            })

        }
        res.json({lead: leads[0], kommoUser, ailooUser: ailooUser});
    } catch (err) {
        next(err);
    }

});

export default router;