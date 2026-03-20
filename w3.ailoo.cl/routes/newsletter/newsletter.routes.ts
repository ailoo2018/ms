import router from "../events-routes.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import schema, {Party} from "../../db/schema.js";
import {eq} from "drizzle-orm";
import validator from 'validator';
import sgMail from "../../connections/sendmail.js";


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

            // notify me about subscription
            await sgMail.send( {
                to: email,
                bcc: "jcfuentes@motomundi.net",
                from: 'ventas@motomundi.cl', // Change to your verified sender
                subject: `Motomundi - Client suscribed to newsletter`,
                html: `isNew=${isNew}, email=${email}, name=${name}`,
            })

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