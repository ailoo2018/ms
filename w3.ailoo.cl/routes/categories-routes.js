const {app} = require("../server");
const container = require("../container");
const linkHelper = require("@ailoo/shared-libs/helpers/LinkHelper");

const categoryService = container.resolve('productCategoryService');


app.get("/:domainId/categories/leafs", async (req, res, next) => {

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