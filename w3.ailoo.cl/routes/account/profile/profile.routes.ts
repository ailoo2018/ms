import { validateJWT } from "../../../server.js";
import { uploadImagesAilooCDN } from "../../../services/cdnService.js";
import { Router } from "express";
import multer from "multer";
import {db as drizzleDb} from "../../../db/drizzle.js";
import schema from "../../../db/schema.js";
import {and, asc, desc, eq, ne} from "drizzle-orm";

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


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
        if(!user.person){
            party = await drizzleDb.query.party.findFirst({
                where: (party, {and, eq}) => and(
                    eq(party.email, user.username.trim()),
                    eq(party.domainId, domainId),
                ),
            })

            if(party != null){
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
            return res.status(400).json({ error: "No image file provided." });
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

        if(resp.uploads?.length > 0) {
            const imageId = resp.uploads[0].imageId

            await drizzleDb
                .update(schema.user)
                .set({ avatar: imageId })
                .where(eq( schema.user.id, req.user.id ))
            // save to db

        }

        res.json(resp);
    } catch (e) {
        // 4. Forward error to Express error handler
        console.error("Upload error:", e);
        res.status(500).json({ error: "Internal server error during upload." });
    }
});

export default router;