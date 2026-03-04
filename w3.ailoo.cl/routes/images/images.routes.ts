import {Router} from "express";
import cmsClient from "../../services/cmsClient.js";
import {productsClient} from "../../clients/productsClient.js";

const router = Router(); // Create a router instead of using 'app'

router.post("/:domainId/images/sizes", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const imageId = req.body.imageId;
        const maintainAspectRatio = req.body.maintainAspectRatio || true;
        const sizes = req.body.sizes || [150, 300, 600];

        const response = await productsClient.createImageSizes(imageId, sizes, maintainAspectRatio, domainId)

        return res.json(response);
    } catch (e) {
        next(e)
    }

})


export default router;