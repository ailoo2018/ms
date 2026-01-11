const {app} = require("../server");
const ProductImageHelper = require("@ailoo/shared-libs/helpers/ProductImageHelper")
const logger = require("@ailoo/shared-libs/logger")
const {findProduct} = require("../el/products");
const {productStock} = require("../db/inventory");

app.get("/:domainId/products/:productId",   async (req, res, next) => {

  try{

    const domainId = parseInt(req.params.domainId);
    const productId = parseInt(req.params.productId)
    const p = await findProduct(productId, domainId)

    const imgHelper = new ProductImageHelper();
    if(p.image){
      p.imageUrl = imgHelper.getUrl(p.image)
    }

    const stock = await productStock(productId, domainId);

    for(var s of stock){
      var prodItem = p.productItems.find(pit => pit.id === s.productItemId )

      if(prodItem) {
        prodItem.quantityInStock = parseInt( s.quantity )
      }
    }


    res.json(p);
  }catch(e){
    next(e)
  }
})