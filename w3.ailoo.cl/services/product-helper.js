const productRepos = require("../el/products");
const {productStock} = require("../db/inventory");
const {productDescription} = require("../db/product");
const categoryTreeService = require("../services/categoryTreeService");
const {ProductType, ProductFeatureType} = require("../models/domain");
const baseUrl = process.env.PRODUCTS_MS_URL
const container = require("../container");

const productService = container.resolve('productsService');
const cartService = container.resolve('cartService');

function getProductItemDescription(product, pit) {
  let desc = product.name;

  if (product.fullName)
    desc = product.fullName;

  if (pit.colorId > 0) {
    const color = product.features.find(f => f.id === pit.colorId)
    desc += " " + color.name
  }

  if (pit.sizeId > 0) {
    const size = product.features.find(f => f.id === pit.sizeId)
    desc += " " + size.name
  }

  return desc;

}

function getProductImage(product, pit) {
  let img = null

  if(product.images.length > 0)
    img = product.images[0];
  if (pit.colorId > 0) {
    img = product.images.find(img => img.colorId === pit.colorId)

  }
  return img
}


const getPriceByProductItem = async (productItemsIds, saleTypeId, domainId) => {


  if (!baseUrl) {
    throw new Error('No baseUrl provided')
  }

  const url = `${baseUrl}/${domainId}/product-items/search`
  const ret = await fetch(url, {
    method: 'POST',
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json", // <--- Add this line
    },
    body: JSON.stringify({productItemsIds, saleTypeId}),
  })

  if (ret.status !== 200) {
    throw new Error(ret.statusText + " url: " + url + " query: " + JSON.stringify({productItemsIds, saleTypeId}))
  }

  return await ret.json()
}

async function isApplicableSalesRule(rule, prodSm, domainId) {
  if (prodSm == null)
    return false;

  if (rule.categories != null && rule.categories.length > 0) {
    if (!prodSm.directCategories || prodSm.directCategories.length === 0)
      return false

    var primaryCatetory = await categoryTreeService.findCategory(prodSm.directCategories[0], domainId)


    if (primaryCatetory != null && !rule.categories.some(c => categoryTreeService.isOrHasParent(primaryCatetory.id, c.id)))
      return false;
  }

  if (rule.brands != null && rule.brands.length > 0 && !rule.brands.some(c => c.id === prodSm.brand.id))
    return false;
  if (rule.models != null && rule.models.length > 0) {
    if (prodSm.model == null || !rule.models.some(c => c.id === prodSm.model.id))
      return false;
  }

  if (rule.tags != null && rule.tags.length > 0) {
    if (prodSm.tags == null || !rule.tags.some(tag => prodSm.tags.some(prodTag => prodTag.id === tag.id)))
      return false;
  }

  if (rule.products != null && rule.products.length > 0 &&
      !rule.products.some(pid => pid.id === prodSm.id)) {
    return false;
  }


  return true;
}

const getProductSalesRules = async (product, domainId) => {
  const packRules = await getSalesRules(domainId)

  const rulesThatApply = []
  for (var pr of packRules) {
    for (var r of pr.rules) {
      if (await isApplicableSalesRule(r, product, domainId))
        rulesThatApply.push(pr)
      break; // basta que una regla aplica
    }
  }
  return rulesThatApply
}

const getSalesRules = async domainId => {
  const rs = await fetch(baseUrl + "/" + domainId + "/sales-discounts/")
  return await rs.json()
}

async function findProduct(productId, domainId) {
  const p = await productService.findProductWithInventory(productId, domainId)
  p.description = await productDescription(productId);

  p.type = p.productType
  if (p.productType === ProductType.Composite) {

    var assocs = await productService.findAssociations(p.id, domainId)
    var products = await productService.findProductsWithInventory(assocs.map(a => a.ContainsId), domainId)

    p.composite = []

    for (var compProd of products) {
      const assoc = assocs.find(a => a.ContainsId === compProd.id)

      let colors = compProd.features.filter(f => f.type === ProductFeatureType.Color)
      if (assoc.ColorId > 0)
        colors = compProd.features.filter(f => f.id === assoc.ColorId)

      let sizes = compProd.features.filter(f => f.type === ProductFeatureType.Size)
      if (assoc.SizeId > 0)
        colors = compProd.features.filter(f => f.id === assoc.SizeId)

      p.composite.push({
        product: compProd,
        colors: colors,
        sizes: sizes,

      });
    }
  }
  return p;
}



module.exports = {
  getProductItemDescription,
  getProductImage,
  getPriceByProductItem,
  getSalesRules,
  getProductSalesRules,

  isApplicableSalesRule,
  findProduct
}