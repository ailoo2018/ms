import { validateJWT } from "../../../server.js";
import { uploadImagesAilooCDN } from "../../../services/cdnService.js";
import { Router } from "express";
import multer from "multer";

const router = Router();

// 1. Add limits to prevent memory exhaustion
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post("/:domainId/account/avatar", upload.single('image'), async (req, res, next) => {
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

        res.json(resp);
    } catch (e) {
        // 4. Forward error to Express error handler
        console.error("Upload error:", e);
        res.status(500).json({ error: "Internal server error during upload." });
    }
});

export default router;