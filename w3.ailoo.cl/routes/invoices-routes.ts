import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq, sql} from "drizzle-orm";
import container from "../container/index.js";
import {SaleType} from "../models/domain.js";
import { Router } from "express";
import {getFeaturesDescription, getProductImage} from "../helpers/product-helper.js";

const router = Router(); // Create a router instead of using 'app'
const productsService = container.resolve("productsService");

router.get("/:domainId/invoices/:invoiceId", async (req, res, next) => {
  try {
    const domainId   = parseInt(req.params.domainId);
    const invoiceId = parseInt(req.params.invoiceId);

    const invoice = await drizzleDb.query.invoice.findFirst({
      where: (invoice) => and(eq(invoice.id, invoiceId), eq(invoice.domainId, domainId)),
      with: {
        items: true
      }
    })

    const items = []

    const pitsIds = invoice.items.filter(it => it.productItemId > 0).map(it2 => it2.productItemId)
    const products = await productsService.findProductsByProductItems(pitsIds, domainId);

    let total = 0;
    let netTotal = 0;
    let envio = 0;
    for(const item of invoice.items.filter(it => it.invoiceItemType !== 7 /*saletax*/)) {

      const retItem = {
        id: item.id,
        quantity: Number(item.quantity),
        type: item.invoiceItemType,
        description: item.description,
        price: item.amount,
        netPrice: item.netAmount,
        oldPrice: 0,
        discount: 0,
        product: null,
        productItem: null,


      }

      total += retItem.price * retItem.quantity;
      netTotal += retItem.netPrice * retItem.quantity;

      let product = null;
      let productItem = null;
      if(item.productId > 0){
        product = products.find(p => p.productItems.some(pit => pit.id === item.productItemId))
        if(product){
          productItem = product.productItems.find(pit => pit.id === item.productItemId);
        }
      }

      if(product && productItem) {
        retItem.product = {
          id: product.id,
          name: product.name,
          fullName: product.fullName,
          brand: {
            id: product.brand?.id,
            name: product.brand?.name,
          }
        }

        const pitImg = getProductImage(product, productItem)
        retItem.productItem = {
          id: productItem.id,
          name: getFeaturesDescription(product, productItem),
          image: pitImg ? pitImg.image : null,
        }


        const { price, oldPrice, discount } = await productsService.price(product, productItem, SaleType.Internet)

      //  retItem.price = price;
        retItem.oldPrice = oldPrice;
        retItem.discount = oldPrice - retItem.price;
      }


      items.push(retItem)
    }



    res.json({
      id: invoice.id,
      number: invoice.number,
      date: invoice.date,
      total: total,
      shipping: 0,
      netTotal: netTotal,
      iva: total - netTotal,
      items: items,
    })
  } catch (e) {
    console.error(e)
    next(e)
  }
})

export default router;