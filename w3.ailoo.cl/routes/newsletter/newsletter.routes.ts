import router from "../events-routes.js";
import {getElClient, getIndexName, getProductCollectionsIndexName} from "../../connections/el.js";
import * as ProductHelper from "../../helpers/product-helper.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import schema, {Party} from "../../db/schema.js";
import {and, eq} from "drizzle-orm";
import * as linkHelper from "@ailoo/shared-libs/helpers/LinkHelper";
import validator from 'validator';

router.post('/:domainId/newsletter/subscribe', async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const {email, name} = req.body;


        let isNew = false;

        let party: Party;
        if (validator.isEmail(email)) {
            party = await drizzleDb.query.party.findFirst({
                    where: (party, {eq, and}) => and(
                        eq(party.email, email),
                        eq(party.type, "PERSON"),
                        eq(party.domainId, domainId)
                    )
                }
            )

            if(party != null ){
                await drizzleDb.update(schema.party)
                    .set({
                        receiveNewsletter: 1
                    })
                    .where(eq(schema.party.id, party.id));
            }else{
                isNew = true;

                await drizzleDb.insert(schema.party).values({
                    name: name,
                    email: email,
                    type: "PERSON",
                    receiveNewsletter: 1,
                    domainId: domainId
                })
            }



        }


        res.json({
            partyId: party?.id,
            isNew: isNew,

        })
    } catch (err) {
        next(err)
    }

});

export default router;