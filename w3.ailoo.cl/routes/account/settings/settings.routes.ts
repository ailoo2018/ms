
import {Router} from "express";
import {db as drizzleDb} from "../../../db/drizzle.js";

import {and, eq} from "drizzle-orm";
import schema from "../../../db/schema.js";
import crypto from "crypto";

import {createToken} from "../../../utils/utils.js";


const router = Router();

router.post("/:domainId/account/create", async (req, res, next   ) => {
    try{
        const domainId = parseInt(req.params.domainId);
        let { fname, lname, email, password,} = req.body;

        if(!email || email.length === 0)
            throw new Error("email is required");
        if(!fname || fname.length === 0)
            throw new Error("fname is required");
        if(!lname || lname.length === 0)
            throw new Error("lname is required");

        fname = fname.trim();
        lname = lname.trim();

        let user = await drizzleDb.query.user.findFirst({
            where: (user, {eq, and}) => and(
                eq(user.username, email),
                eq(user.domainId, domainId)
            )
        })

        if(user){
            return res.status(500).json({ message: "Usuario ya existe", errorCode: "USER_EXISTS"})
        }


        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

        const [result] = await drizzleDb.insert(schema.user).values({
            username: String(email),
            password: hashedPassword,
            // isGoogleLogin: true,
            domainId: domainId })
        let userId = result.insertId;

        // what do i do if a party already exists for email
        const party = await drizzleDb.query.party.findFirst({
            where: (party, {eq, and}) => and(
                eq(party.email, email),
                eq(party.type, "PERSON"),
                eq(party.domainId, domainId)
            )
        })

        let partyId = 0
        if(party){


            await drizzleDb.update(schema.user).set({
                personId: party.id,
            }).where(eq(schema.user.id, userId));

            await drizzleDb.update(schema.party).set({
                firstName: (fname || "").trim(),
                lastName: (lname || "").trim(),
                name: (fname + " " + lname),
            }).where(eq(schema.user.id, userId));

        }else{
            // create party
            let [result] = await drizzleDb.insert(schema.party).values(
                {
                    name: fname + " " + lname,
                    firstName: fname,
                    lastName: lname,
                    email: email,
                    domainId: domainId,
                    type: "PERSON",
                    createDate: new Date(),
                    modifiedDate: new Date(),
                    receiveNewsletter: 1,
                }
            )

            partyId = result.insertId;

            await drizzleDb.update(schema.user).set({
                personId: partyId,
            }).where(eq(schema.user.id, userId));
        }


        res.json({
            userId: userId,
            username: email,
            partyId: partyId,
            partyName: fname + " " + lname,
            accessToken: createToken({
                id: userId,
                username: email,
                partyId: partyId,

            })
        });
    }catch(e){
        console.error(e)
        next(e)
    }
})

export default router;