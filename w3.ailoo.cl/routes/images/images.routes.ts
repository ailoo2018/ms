import {Router} from "express";
import {productsClient} from "../../clients/productsClient.js";

 // Create a router instead of using 'app'
import path from "path";
import {pool} from "../../connections/mysql.js";

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
        const imageId = req.body.imageId ? extractGuid(req.body.imageId) : null;
        const productId = parseInt(req.body.productId);
        const maintainAspectRatio = req.body.maintainAspectRatio || false;
        const sizes = req.body.sizes || [150, 300, 600, 800];

        if(productId > 0){
            const imagesIds = await productImagesIds(productId);

            const arrResp = []
            for(const imgId of imagesIds){
                const response = await productsClient.createImageSizes(imgId, sizes, maintainAspectRatio, domainId)
                arrResp.push(response)
            }

            return res.json(arrResp)
        }else{
            const response = await productsClient.createImageSizes(imageId, sizes, maintainAspectRatio, domainId)
            return res.json(response);
        }




    } catch (e) {
        console.error(`Error calling /:domainId/images/sizes : body is ${JSON.stringify(req.body)}`)
        next(e)
    }

})


async function productImagesIds(productId: number){
    const connection = await pool.getConnection();

    try {
        const [rows] = await connection.execute(
            `
                select * from productimage where ProductId = ?
            `, [productId]) as any;


        return rows.map(r => {
            return r.Image
        });
    } catch (error) {
        console.log(error);
    } finally {
        await connection.release();
    }

}


export default router;