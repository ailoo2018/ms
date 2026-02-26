import {validateJWT} from "../../../server.js";
import {uploadImagesAilooCDN} from "../../../services/cdnService.js";
import {Router} from "express";
import multer from "multer";
import {db as drizzleDb} from "../../../db/drizzle.js";
import schema from "../../../db/schema.js";
import {and, asc, desc, eq, ne} from "drizzle-orm";
import crypto from "crypto";

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 5 * 1024 * 1024} // 5MB limit
});

const ridingStyles = {
    rsATV: "ATV/Quadrimoto",
    rsMX: "MOTOCROSS/ENDURO",
    rsAdv: "TRAIL/ADVENTURE",
    rsHarley: "CHOPPER",
    rsCafeRacer: "CAFE RACER/VINTAGE",
    rsRace: "SPORT/RACING",
    rsScooter: "SCOOTER/URBAN/CITY",
    rsSportTouring: "TOURING"
}

const Gender = {
    "undisclosed": 0,
    "male": 1,
    "female": 2,
    "other": 3
}
router.get("/:domainId/account/profile", validateJWT, async (req, res, next) => {
    try {
        const user = await drizzleDb.query.user.findFirst({
            where: (user, {eq, and}) => {
                return and(eq(user.id, req.user.id))
            },
            with: {
                person: true
            }
        });

        if (!user) {
            return res.status(400).json({message: 'User not found'});
        }

        let firstName = '', lastName = '', phone = '', gender = 'undisclosed', dateOfBirth = null;
        let genderId = 0;
        let ridingStyle = []
        if (user.person) {
            firstName = user.person.firstName;
            lastName = user.person.lastName;
            phone = user.person.phone;
            genderId = user.person.gender || 0;

            gender = "undisclosed"
            for(var key in Gender) {
                if(Gender[key] == genderId) {
                    gender = key;
                }
            }


            dateOfBirth = user.person.birthDay?.toISOString()?.substring(0, 10) || null;


            if (user.person.ridingStyles?.length > 0) {
                ridingStyle = user.person.ridingStyles.split(",").filter(rs => rs?.length > 0); /*.map(rsId => {
                    return {
                        id: rsId,
                        description: ridingStyles[rsId],
                    }
                });*/
            }
        }

        res.json({
            userId: user.id,
            partyId: user.person?.id || 0,
            firstName,
            lastName,
            phone,
            dateOfBirth: dateOfBirth,
            gender: gender,
            ridingStyles: ridingStyle,
            rsStr: user.person?.ridingStyles || '',
        })

    } catch (e) {
        next(e)
    }
})

router.post("/:domainId/account/password", validateJWT, async (req, res, next) => {
    try{
        const { current, new: password } = req.body

        const user = await drizzleDb.query.user.findFirst({
            where: (user, {eq}) => eq(user.id, req.user.id),
        });

        const hashedPassword = crypto.createHash('md5').update(current).digest('hex');

        if(user.password !== hashedPassword) {
            return res.status(401).json({
                code: 'WRONG_PASSWORD',
                message: "La contraseña actual es incorrecta. Por favor, verifícala e intenta de nuevo",
                error: "Invalid credentials"
            });
        }

        const hashedCurrent = crypto.createHash('md5').update(password).digest('hex');

        await drizzleDb.update(schema.user).set({
            password: hashedCurrent,
        }).where(eq(schema.user.id, req.user.id))


        res.json({
            id: user.id
        })
    }catch(e){
        next(e)
    }
})




router.post("/:domainId/account/profile", validateJWT, async (req, res, next) => {

    try {

        const user = await drizzleDb.query.user.findFirst({
            where: (user, {eq, and}) => {
                return and(eq(user.id, req.user.id))
            },

        });


        let gender = 0;
        if(req.body.gender?.length > 0) {
            gender = Gender[req.body.gender] || 0
        }


        await drizzleDb
            .update(schema.party)
            .set({
                firstName: req.body.firstName?.trim() || null,
                lastName: req.body.lastName?.trim() || null,
                birthDay: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
                ridingStyles: req.body.ridingStyles?.join(",") || null,
                phone: req.body.phone,
                gender: gender,
            })
            .where(eq(schema.party.id, user.personId));

        const party = await drizzleDb.query.party.findFirst({
            where: (party, {eq}) => eq(party.id, user.personId),
        })

        res.json(party)
    } catch (e) {
        next(e)
    }
})

router.get("/:domainId/account/user", validateJWT, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const domainId = parseInt(req.params.domainId);

        const user = await drizzleDb.query.user.findFirst({
            where: (user, {eq}) => eq(user.id, userId),
            // Use 'with' if you need the linked Party (Person) data too
            with: {
                person: true
            }
        });

        let party = user.person || null;
        if (!user.person) {
            party = await drizzleDb.query.party.findFirst({
                where: (party, {and, eq}) => and(
                    eq(party.email, user.username.trim()),
                    eq(party.domainId, domainId),
                ),
            })

            if (party != null) {
                await drizzleDb.update(schema.user).set({
                    personId: party.id,
                }).where(eq(schema.user.id, userId));
            }

        }

        res.json({
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            lastLogin: user.lastLogin,
            person: party,
        })
    } catch (err) {
        next(err);
    }
})

router.post("/:domainId/account/avatar", upload.single('image'), validateJWT, async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const file = req.file;

        // 2. Check if file exists
        if (!file) {
            return res.status(400).json({error: "No image file provided."});
        }

        const avatar = {
            fieldname: file.fieldname,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer, // The actual file data in memory
            encoding: file.encoding
        }
        // 3. Pass the file to your service
        const resp = await uploadImagesAilooCDN([avatar], domainId);

        if (resp.uploads?.length > 0) {
            const imageId = resp.uploads[0].imageId

            await drizzleDb
                .update(schema.user)
                .set({avatar: imageId})
                .where(eq(schema.user.id, req.user.id))
            // save to db

        }

        res.json(resp);
    } catch (e) {
        // 4. Forward error to Express error handler
        console.error("Upload error:", e);
        res.status(500).json({error: "Internal server error during upload."});
    }
});

export default router;