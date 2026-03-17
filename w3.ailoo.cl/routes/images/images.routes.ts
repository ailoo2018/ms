import {Router} from "express";
import {productsClient} from "../../clients/productsClient.js";

 // Create a router instead of using 'app'
import path from "path";

const router = Router();

function extractGuid(input: string) {
    // 1. Get just the filename (works whether 'input' is a URL or just a filename)
    const filename = path.basename(input);

    // 2. Separate extension (.jpg) from the name (55fe1374..._300)
    const ext = path.extname(filename);
    const nameOnly = path.basename(filename, ext);

    // 3. Split by underscore and take the first part
    const guid = nameOnly.split('_')[0];

    return `${guid}${ext}`;
}

router.post("/:domainId/images/sizes", async (req : any, res : any, next : any) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const imageId = extractGuid(req.body.imageId);
        const maintainAspectRatio = req.body.maintainAspectRatio || true;
        const sizes = req.body.sizes || [150, 300, 600, 800];

        const response = await productsClient.createImageSizes(imageId, sizes, maintainAspectRatio, domainId)

        return res.json(response);
    } catch (e) {
        console.error(`Error calling /:domainId/images/sizes : body is ${JSON.stringify(req.body)}`)
        next(e)
    }

})


export default router;