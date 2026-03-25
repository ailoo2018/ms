import {DiscountRuleService} from "../services/DiscountRuleService.js";
import { convert } from "../services/CurrencyService.js";
import {Money, Price, PriceComponentType} from "../models/index.js";

const getFeatures = (pit:any) => {
  const ret = [];

  if (pit.colorId > 0) ret.push(pit.colorId);
  if (pit.sizeId > 0) ret.push(pit.sizeId);

  return ret;
}

const findProductItemByFeatures = (pSm:any, features:any) => {
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


export const getPrice = async (prodSm:any, pit:any, saleTypeId:any, currency:any, packId = 0, quantity = 1,  discountRuleService:any) => {
  return await _getPriceByProductItem(prodSm, pit, saleTypeId, currency, packId, quantity,  discountRuleService);
}

function hasBasePrice(price:any) {
  if (!price.priceComponents) return false;

  return price.priceComponents.some((pc:any) => pc.type == PriceComponentType.BASE_PRICE || pc.type == PriceComponentType.BASE_NET_PRICE);
}

function isQuantityWithin(pc:any, quantity:any) {
  const thruQty = pc.thruQuantity <= 0 ? Number.MAX_VALUE : pc.thruQuantity;
  return quantity >= pc.fromQuantity && quantity <= thruQty;
}

const _getPriceByProductItem = async (
    product:any,
    pit:any,
    saleTypeId:any,
    currency:any,
    packId:any,
    quantity:any,
    discountRuleService:any
) => {
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
  price.domainId = product.domainId;

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
            price: await convert("CLP", currency, pc.amount)  ,
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

  // If no productItem price, search for feature price
  if (!hasBasePrice(price)) {
    for (const pc of pcs) {
  //    if (currency !== pc.currency) continue;

      if (pc.typeId === PriceComponentType.DISCOUNT &&
          (pc.packId > 0 && packId !== pc.packId)) continue;

      if (pc.sizeId && features.includes(pc.sizeId) &&
          (pc.saleTypeId === 0 || pc.saleTypeId === saleTypeId)) {

        if (isQuantityWithin(pc, quantity)) {
          fromQty = Math.max(pc.fromQuantity, fromQty);
          thruQty = Math.min(pc.thruQuantity === 0 ? Number.MAX_VALUE : pc.thruQuantity, thruQty);

          price.priceComponents.push({
            price: await convert("CLP", currency, pc.amount)  ,
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
  //    if (currency !== pc.currency) continue;

      if (pc.typeId === PriceComponentType.DISCOUNT &&
          (pc.packId > 0 && packId !== pc.packId)) continue;

      if (!pc.sizeId || pc.sizeId === null) {
        if (pc.brandId !== 0 && pc.brandId !== product.brand.id) continue;

        if (!(pc.saleTypeId === 0 || pc.saleTypeId === saleTypeId)) continue;

        if (isQuantityWithin(pc, quantity)) {
          fromQty = Math.max(pc.fromQuantity, fromQty);
          thruQty = Math.min(pc.thruQuantity === 0 ? Number.MAX_VALUE : pc.thruQuantity, thruQty);

          price.priceComponents.push({
            price: await convert("CLP", currency, pc.amount) ,
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
  price.addSaleTaxes(product.salesTaxes.map((s:any) => {
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      percentage: s.percentage,
      domainId: product.domainId
    }
  }));

  // Look for discounts
  let categoryId = 0;
  if (product.categories.length > 0) {
    categoryId = product.categories[0].id;
  }


  if (product.discounts?.length > 0) {
    const discount = product.discounts.find((d:any) => !d.saleTypes || d.saleTypes.length === 0 || d.saleTypes.some((st:any) => st.id === saleTypeId));
    if(discount) {
      price.priceComponents.push({
        type: PriceComponentType.DISCOUNT,
        percent: discount.percent || 0,
        price: {
          amount: discount.amount || 0,
        }
      });
    }
  }


  price.fromQuantity = fromQty;
  price.thruQuantity = thruQty;


  return price;

}


