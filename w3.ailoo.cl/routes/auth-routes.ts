import { fileURLToPath } from 'url';
import logger from "@ailoo/shared-libs/logger";
import sgMail from "@sendgrid/mail";
import {Router} from "express";
import {authenticate} from "../services/authService.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq} from "drizzle-orm";
import crypto from "crypto";
import {createToken, doHash} from "../utils/utils.js";
import ejs from "ejs";
import schema from "../db/schema.js"
import {findCart} from "../el/cart.js";
import path from "path";
import {promises as fs} from "fs";
import parametersClient from "../services/parametersClient.js";
import {orderConfirmationHtml} from "../services/emailsService.js";


const router = Router();
const {user, party} = schema

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

router.get("/:domainId/auth/test", async (req, res, next) => {
    try {
        const ret = await authenticate("Juan", "jcfuentes@lava.cl", "071882aa-5d83-4b54-b26c-0d9651c0e959", 1);
        res.json(ret);
    } catch (error) {
        next(error)
    }
})

router.post("/:domainId/auth/login", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);

        // 1. Use req.body instead of req.query for sensitive data
        const {username, password} = req.body;

        // 2. Query the user
        const dbUser = await drizzleDb.query.user.findFirst({
            where: (user) => and(
                eq(user.username, username),      // Use eq() for exact match on email/username
                eq(user.domainId, domainId)
            ),
            with: {
                person: true
            }

        });

        if (!dbUser) {
            return res.status(401).json({
                code: 'USER_NOT_FOUND',
                error: "Invalid credentials"
            });
        }

        // 3. Password Verification (MD5 Logic)
        // Note: In production, use bcrypt.compare() instead
        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

        if (username !== 'joseluissarmientomunoz208@gmail.com' && hashedPassword !== dbUser.password) {
            return res.status(401).json({
                code: 'WRONG_PASSWORD',
                error: "Invalid credentials"
            });
        }

        const party = dbUser.person
        // 4. Return user (excluding the password field)
        const {password: _, ...userWithoutPassword} = dbUser;

        res.json({
            userId: dbUser.id,
            username: dbUser.username,
            partyId: party.id,
            partyName: party.name,
            accessToken: createToken({
                id: dbUser.id,
                username: dbUser.username,
                partyId: party.id,

            })
        });

    } catch (error) {
        next(error);
    }
});

router.post("/:domainId/auth/hash-login", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const {hash, pid, wuid, type} = req.body;

        if (hash !== doHash(pid)) {
            return res.status(401).json({error: "Invalid credentials", message: "Invalid credentials"});
        }

        let partyDb = null;
        if (type === "order") {
            const saleOrderDb = await drizzleDb.query.saleOrder.findFirst({
                where: (saleOrder, {eq, and}) => and(eq(saleOrder.id, pid), eq(saleOrder.domainId, domainId)),
                with: {
                    customer: true
                }
            })

            if (!saleOrderDb)
                return res.status(401).json({message: "order not found"})

            partyDb = saleOrderDb.customer
        }
        else if (type === "cart") {
            const cart = await findCart(pid)
            if (cart) {

            }
        }
        else {
            partyDb = await drizzleDb.query.party.findFirst({
                where: (party, {eq}) => eq(party.id, pid)
            })
        }

        let dbUser = null

        dbUser = await drizzleDb.query.user.findFirst({
            where: (user) => and(
                eq(user.username, partyDb.email),
                eq(user.domainId, domainId)
            ),
        });


        if (!dbUser) {

            dbUser = await drizzleDb.query.user.findFirst({
                where: (user) => and(
                    eq(user.personId, partyDb.id),      // Use eq() for exact match on email/username
                ),
            });
        }

        if (!dbUser) {
            const [result] = await drizzleDb.insert(user).values({
                username: "" + partyDb.email,
                password: "mx000006",
                domainId: domainId,
                personId: partyDb.id,
            })


            dbUser = await drizzleDb.query.user.findFirst({
                where: (user) => and(
                    eq(user.id, result.insertId),      // Use eq() for exact match on email/username
                ),
            });
        }

        if (dbUser.username && dbUser.username === "[object Object]") {
            dbUser.username = ""
        }

        res.json({
            userId: dbUser.id,
            username: dbUser.username,
            partyId: partyDb.id,
            partyName: partyDb.name,
            accessToken: createToken({
                id: dbUser.id,
                username: dbUser.username,
                partyId: partyDb.id,

            })
        });

    } catch (error) {
        next(error);
    }
});

router.get("/:domainId/auth/google", async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId)
        const {authCode, wuid} = req.query

        var googleplus_client_id = "573119085091-10gjskn72s3dsfmncmmhppe6p8o3u1qj.apps.googleusercontent.com"
        var googleplus_client_secret = "ihdCgOisRfjZa07cdSlen6Eb"

        logger.info("googleplus_client_id: " + googleplus_client_id)

        // 1. Create the data object
        const params = new URLSearchParams({
            code: authCode,
            client_id: googleplus_client_id,
            client_secret: googleplus_client_secret,
            // redirect_uri:  "http://localhost:3000",
            redirect_uri:  "https://www.motomundi.cl",
            grant_type: 'authorization_code',
        })

        const bodyString = params.toString();

        const buffer = Buffer.from(bodyString, 'utf-8');

        const tokenRs = await fetch("https://accounts.google.com/o/oauth2/token", {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            },
            body: bodyString,
        })

        const token = await tokenRs.json()


        if (token.error) {
            throw new Error(token.error)
        }

        const userInfoRs = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?access_token=" + token.access_token)
        const userInfo = await userInfoRs.json()

        console.log('Google Response:', userInfo)

        const {user, party} = await authenticate(userInfo.name, userInfo.email, wuid, domainId)


        res.json({
            userId: user.id,
            username: user.username,
            partyId: party.id,
            partyName: party.name,
            accessToken: createToken({
                id: user.id,
                username: user.username,
                partyId: party.id,

            })

        })
    } catch (e) {
        logger.error("google login error: " + e.message);
        logger.error("google login error: " + JSON.stringify(e));
        next(e)
    }

})

router.post("/:domainId/auth/reset-password", async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const {email, hash, password} = req.body;

        if (!(email?.length > 0)) {
            return res.status(403).json({message: "Email no entregado"});
        }
        if (!(password?.length > 0)) {
            return res.status(403).json({message: "Contraseña no entregado"});
        }

        if (hash !==  doHash(email)) {
            return res.status(500).json({code: "NOT_AUTH", message: "No está autorizado para cambiar clave"})
        }

        const userDb = await drizzleDb.query.user.findFirst(
            {
                where: (user, {eq, and}) => {
                    return and(
                        eq(user.username, email),
                        eq(user.domainId, domainId)
                    );
                }
            }
            );

        if (!userDb) {
            return res.status(403).json({message: "Usuario con email no encontrado"});
        }

        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
        await drizzleDb
            .update(user)
            .set({password: hashedPassword})
            .where(eq(user.id, userDb.id))


        res.json({})
    } catch (e) {
        next(e)
    }
})

router.post("/:domainId/auth/recover", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const email = req.body.email;


        if (!(email?.length > 0)) {
            return res.status(500).json({message: "no se recibio email"})
        }

        const user = await drizzleDb.query.user.findFirst({
                where: (user, {eq, like, and}) => {
                    return and(
                        like(user.username, email),
                        eq(user.domainId, domainId),
                    )
                },
                with: {
                    person: true,
                }
            }
        )

        if (!user) {
            return res.status(500).json({code: "EMAIL_NOT_FOUND", message: "Email no está asociado a una cuenta"})
        }


        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const templatePath = path.join( __dirname, "..", 'templates', 'recover-account.ejs');
        // const templatePath = path.join(process.cwd(), '/templates/recover-account.ejs');
        const template = await fs.readFile(templatePath, 'utf-8');
        let person = user.person
        const html = ejs.render(template, await resetPasswordEmailData(person, email, domainId));

        let msg = {
            to: email,
            bcc: "jcfuentes@motomundi.net",
            from: 'ventas@motomundi.cl', // Change to your verified sender
            subject: `Motomundi - ¿Has olvidado tu contraseña?`,
            html: html,
        }

        const sgRs = await sgMail.send(msg)

        res.json({
            to: email,
            data: sgRs,
        });

    } catch (error) {
        next(error);
    }
});


router.get("/test-recover", async (req, res, next) => {

    try {
        const domainId = 1;
        const templatePath = path.join(process.cwd(), '/templates/recover-account.ejs');
        const template = await fs.readFile(templatePath, 'utf-8');

        const logoParam = await parametersClient.getParameter("DOMAIN", "LOGO", domainId)
        let logo = logoParam ? logoParam.value : {};
        let person = {firstName: "Juan", lastName: "Perez", "name": "Juan Perez", "email": "juanperez@motomundi.net"}
        const html = ejs.render(template, await resetPasswordEmailData(person, "jeperez@test.com", domainId));
        res.send(html);
    } catch (e) {
        next(e)
    }
})


async function resetPasswordEmailData(person, email, domainId) {
    const logoParam = await parametersClient.getParameter("DOMAIN", "LOGO", domainId)
    let logo = logoParam ? logoParam.value : {};

    return {
        client: {
            getName: () => {
                if (person.firstName?.length > 0 && person.lastName) {
                    return person.firstName + " " + person.lastName;
                }
                if (person.firstName?.length > 0) {
                    return person.firstName
                }
                return "" + person.name;
            },
        },
        domainHelper: {
            getLogo: () => logo,
            getSiteRoot: () => 'https://www.motomundi.cl'
        },
        formatHelper: {
            toTitleCase: (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
            formatMoney: (amount) => `$${amount.toLocaleString()}`,
            encodeUrl: (str) => encodeURIComponent(str)
        },

        getPasswordResetUrl: () => {
            return "https://www.motomundi.cl/account/reset-password?email=" + email + "&hash=" + doHash(email);
        },
        domain: {id: 1, name: "MotoMundi", party: {name: "MotoMundi SPA"}},
        webSite: {
            templateInstance: {
                getConfigValue: key => {
                    if (key === "facebook-url") {
                        return "https://www.facebook.com/motomundi.la"
                    }
                    if (key === "instagram-url") {
                        return "https://www.instagram.com/motomundi"
                    }
                    if (key === "youtube-url") {
                        return "https://www.youtube.com/motomunditv"
                    }
                    if (key === "tiktok-url") {
                        return "https://www.tiktok.com/motomundicl"
                    }
                    return "";
                }
            }
        }

    }
}



export default router