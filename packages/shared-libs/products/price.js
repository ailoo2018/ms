const {DiscountRuleService} = require("../services/DiscountRuleService");
const {Price, PriceComponentType, Money} = require("../models");


const getFeatures = (pit) => {
  const ret = [];

  if (pit.colorId > 0) ret.push(pit.colorId);
  if (pit.sizeId > 0) ret.push(pit.sizeId);

  return ret;
}

const findProductItemByFeatures = (pSm, features) => {
  for (const pit of pSm.productItems) {
    const pitFeatures = [...getFeatures(pit)].sort((a, b) => a - b);
    const compareFeatures = [...features].sort((a, b) => a - b);

    if (pitFeatures.length === features.length) {
      let found = true;

      for (let i = 0; i < pitFeatures.length; i++) {
        if (pitFeatures[i] !== compareFeatures[i]) {
          found = false;
          break;
        }
      }

      if (found) {
        return pit;
      }
    }
  }

  return null;
}


const getPrice = async (prodSm, pit, saleTypeId, currency, packId = 0, quantity = 1,  discountRuleService) => {

  return await _getPriceByProductItem(prodSm, pit, saleTypeId, currency, packId, quantity,  discountRuleService);
}

function hasBasePrice(price) {
  if (!price.priceComponents) return false;

  return price.priceComponents.some(pc => pc.type == PriceComponentType.BASE_PRICE || pc.type == PriceComponentType.BASE_NET_PRICE);
}

function isQuantityWithin(pc, quantity) {
  const thruQty = pc.thruQuantity <= 0 ? Number.MAX_VALUE : this.thruQuantity;
  return quantity >= pc.fromQuantity && quantity <= thruQty;
}

const _getPriceByProductItem = async (product, pit, saleTypeId, currency, packId, quantity, discountRuleService) => {
  if (!product.priceComponents) return null;

  if (!currency) {
    currency = "CLP";
  }


  // Initialize price parameters
  let fromQty = 0;
  let thruQty = Number.MAX_VALUE;
  const features = getFeatures(pit);

  // Create new price object
  const price = new Price(currency || "CLP", saleTypeId);
  price.domainId = this.domainId;

  // Sort price components by saleTypeId descending
  const pcs = [...product.priceComponents].sort((a, b) => b.saleTypeId - a.saleTypeId);

  // Check for product item specific price
  if (pit) {
    for (const pc of pcs) {
      if (pc.productItemId > 0 && pc.productItemId === pit.id) {
        if (isQuantityWithin(pc, quantity)) {
          fromQty = Math.max(pc.fromQuantity, fromQty);
          thruQty = Math.min(pc.thruQuantity === 0 ? Number.MAX_VALUE : pc.thruQuantity, thruQty);

          price.priceComponents.push({
            price: new Money(pc.amount, currency),
            type: pc.typeId,
            fromQuantity: pc.fromQuantity,
            thruQuantity: pc.thruQuantity
          });
        } else {
          if (pc.fromQuantity > quantity) {
            thruQty = Math.min(pc.fromQuantity, thruQty);
          }
        }
      } else if (this.domainId === 2093 && pc.productItemId === null) {
        if (isQuantityWithin(pc, quantity)) {
          fromQty = Math.max(pc.fromQuantity, fromQty);
          thruQty = Math.min(pc.thruQuantity === 0 ? Number.MAX_VALUE : pc.thruQuantity, thruQty);

          price.priceComponents.push({
            price: new Money(pc.amount, currency),
            type: pc.typeId,
            fromQuantity: pc.fromQuantity,
            thruQuantity: pc.thruQuantity,
            saleType: SaleType.find(pc.saleTypeId)
          });
        } else {
          if (pc.fromQuantity > quantity) {
            thruQty = Math.min(pc.fromQuantity, thruQty);
          }
        }
      }
    }
  }

  // If no productItem price, search for feature price
  if (!hasBasePrice(price)) {
    for (const pc of pcs) {
      if (currency !== pc.currency) continue;

      if (pc.typeId === PriceComponentType.DISCOUNT &&
          (pc.packId > 0 && packId !== pc.packId)) continue;

      if (pc.sizeId !== null && features.includes(pc.sizeId) &&
          (pc.saleTypeId === 0 || pc.saleTypeId === saleTypeId)) {

        if (isQuantityWithin(pc, quantity)) {
          fromQty = Math.max(pc.fromQuantity, fromQty);
          thruQty = Math.min(pc.thruQuantity === 0 ? Number.MAX_VALUE : pc.thruQuantity, thruQty);

          price.priceComponents.push({
            price: new Money(pc.amount, currency),
            type: pc.typeId,
            fromQuantity: pc.fromQuantity,
            thruQuantity: pc.thruQuantity
          });
        } else {
          if (pc.fromQuantity > quantity) {
            thruQty = Math.min(pc.fromQuantity, thruQty);
          }
        }
      }
    }
  }

  // Look for generic product base price
  if (!hasBasePrice(price)) {
    for (const pc of pcs) {
      if (currency !== pc.currency) continue;

      if (pc.typeId === PriceComponentType.DISCOUNT &&
          (pc.packId > 0 && packId !== pc.packId)) continue;

      if (!pc.sizeId || pc.sizeId === null) {
        if (pc.brandId !== 0 && pc.brandId !== this.brand.id) continue;

        if (!(pc.saleTypeId === 0 || pc.saleTypeId === saleTypeId)) continue;

        if (isQuantityWithin(pc, quantity)) {
          fromQty = Math.max(pc.fromQuantity, fromQty);
          thruQty = Math.min(pc.thruQuantity === 0 ? Number.MAX_VALUE : pc.thruQuantity, thruQty);

          price.priceComponents.push({
            price: new Money(pc.amount, currency),
            type: pc.typeId,
            fromQuantity: pc.fromQuantity,
            thruQuantity: pc.thruQuantity
          });
        } else {
          if (pc.fromQuantity > quantity) {
            thruQty = Math.min(pc.fromQuantity, thruQty);
          }
        }
      }
    }
  }

  // Add sales taxes
  price.addSaleTaxes(product.salesTaxes.map(s => {
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      percentage: s.percentage,
      domainId: this.domainId
    }
  }));

  // Look for discounts
  let categoryId = 0;
  if (product.categories.length > 0) {
    categoryId = product.categories[0].id;
  }

  // Check for non-product specific discounts

//  const discountRuleService = new DiscountRuleService(treeMap);
  const nonProdSpecificDiscount = await discountRuleService.nonProductSpecificDiscount(
      null,
      product.brand.id,
      product.categories.map(c => c.id),
      parseInt(saleTypeId),
      product.tags.map(t => t.id),
      product.domainId,
      quantity,
      product.id
  );

  if (nonProdSpecificDiscount) {
    price.priceComponents.push(nonProdSpecificDiscount);
  }


  price.fromQuantity = fromQty;
  price.thruQuantity = thruQty;

  console.log(price.getFinalPrice().amount)

  return price;

}


module.exports = { getPrice }