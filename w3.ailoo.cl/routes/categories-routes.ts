import {Router} from "express";
import container from "../container/index.js";
import linkHelper from "@ailoo/shared-libs/helpers/LinkHelper";

const categoryService = container.resolve('productCategoryService');

const router = Router();

router.get("/:domainId/categories/leafs", async (req, res, next) => {

  try{
    const { parentId } = req.query;
    const domainId = parseInt(req.params.domainId);

    const ids =  Array.isArray( parentId) ? parentId : [ parentId ];

    const leafs = await categoryService.leafs(ids.map(id => parseInt(id)), domainId)

    leafs.forEach(leaf => {
      leaf.url = linkHelper.getCategoryUrl(leaf)
    })
    res.json({
      categories: leafs
    })
  }catch(e){
    next(e)
  }
});


export default router;