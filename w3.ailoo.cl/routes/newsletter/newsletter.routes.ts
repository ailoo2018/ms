import router from "../events-routes.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import schema, {Party} from "../../db/schema.js";
import {eq} from "drizzle-orm";
import validator from 'validator';
import sgMail from "../../connections/sendmail.js";
import {fileURLToPath} from "url";
import path from "path";
import {promises as fs} from "fs";
import parametersClient from "../../services/parametersClient.js";
import ejs from "ejs";

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


            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const templatePath = path.join( __dirname, "../..", 'templates', 'newsletter.ejs');
            const template = await fs.readFile(templatePath, 'utf-8');

            const logoParam = await parametersClient.getParameter("DOMAIN", "LOGO", domainId)
            let logo = logoParam ? logoParam.value : {};

            const html = ejs.render(template, {
                name: name,
                email: email,
                unsubscribeUrl: "https://www.motomundi.cl",
                formatHelper: {
                    toTitleCase: (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
                    formatMoney: (amount) => `$${amount.toLocaleString()}`,
                    encodeUrl: (str) => encodeURIComponent(str)
                },
                domain: {id: 1, name: "MotoMundi", party: {name: "MotoMundi SPA"}},
                domainHelper: {
                    getLogo: () => logo,
                    getSiteRoot: () => 'https://www.motomundi.cl'
                },

                webSite: {
                    templateInstance: {
                        getConfigValue: key => {
                            if(key === "facebook-url"){
                                return "https://www.facebook.com/motomundi.la"
                            }
                            if(key === "instagram-url"){
                                return "https://www.instagram.com/motomundi"
                            }
                            if(key === "youtube-url"){
                                return "https://www.youtube.com/motomunditv"
                            }
                            if(key === "tiktok-url"){
                                return "https://www.tiktok.com/motomundicl"
                            }
                            return "";
                        }
                    }
                }
            });

            await sgMail.send( {
                to: email,
                bcc: "jcfuentes@motomundi.net",
                from: 'ventas@motomundi.cl', // Change to your verified sender
                subject: `Bienvenido a la comunidad Motomundi, ${name} 🙌`,
                html: html,
            })


            // notify me about subscription
/*
            await sgMail.send( {
                to: email,
                bcc: "jcfuentes@motomundi.net",
                from: 'ventas@motomundi.cl', // Change to your verified sender
                subject: `Motomundi - Client suscribed to newsletter`,
                html: `isNew=${isNew}, email=${email}, name=${name}`,
            })
*/

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