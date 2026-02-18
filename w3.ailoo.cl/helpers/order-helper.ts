import container from "../container/index.js";
import {getProductImage} from "./product-helper.js";
import * as ProductHelper from "./product-helper.js";



export const ordersHelper = {
  getTotal: orders => {

    let total = 0;
    for(var item of orders.items){
      total += item.quantity * item.unitPrice
    }

    return total
  },

  getProductItems: async (order, domainId)  => {
    const pitIds = []
    for (var oi of order.items) {
      if (oi.productItemId > 0 && !pitIds.some(pid => pid === oi.productItemId))
        pitIds.push(oi.productItemId)
    }

    const productService = container.resolve('productsService');
    const products = await productService.findProductsByProductItems(pitIds, domainId)

    const pitMap = new Map()
    for(const pitId of pitIds){
      if(!pitId || !(pitId > 0))
        continue;

      const product = products.find(p => p.productItems.some(pit => {
        return pit.id === oi.productItemId
      }));
      if (!product)
        continue;

      var productItem = product.productItems.find(pit => pit.id === oi.productItemId)
      if (!productItem)
        continue;

      var image = getProductImage(product, productItem)

      if(!pitMap.has(pitId)){
        pitMap.set(pitId, {
          id: productItem.id,
          image: image?.image || null,
          description: ProductHelper.getProductItemDescription(product, productItem),
          product: {
            id: product.id,
            name: product.name,
            fullName: product.fullName,
            brand: product.brand,
            image: image.image,
          },
        })
      }



    }

    return pitMap

  } ,
}

