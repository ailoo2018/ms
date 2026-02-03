const CartRepos = require("../el/cart");
const {CartItemType} = require("../models/cart-models");
const {findProductByProductItem} = require("../el/products");
const ProductHelper = require("./product-helper");
const {SaleType} = require("../models/domain");
const container = require("../container");
const LinkHelper = require("@ailoo/shared-libs/helpers/LinkHelper")

const productService = container.resolve('productsService');
const cartService = container.resolve('cartService');

async function findCart(wuid, domainId) {
  const cart = await CartRepos.findCartByWuid(wuid)

  if (!cart) {
    return null
  }


  cart.oldPrice = 0
  cart.shipping = {cost: 0}
  cart.financing = {installments: 1}
  cart.totalItems = 0

  let total = 0
  for (const cartItem of cart.items) {
    if (!cartItem)
      continue

    if (cartItem.type == CartItemType.Product && (!cartItem.packContents || cartItem.packContents.length == 0)) {
      const product = await findProductByProductItem(cartItem.product.productItemId, domainId)
      const productItem = product.productItems.find(pit => pit.id === cartItem.product.productItemId);
      const img = ProductHelper.getProductImage(product, productItem)
      if (img)
        cartItem.image = img.image

      cart.totalItems += cartItem.quantity

      const color = product.features.find(f => f.id === productItem.colorId)
      cartItem.color = color ? color : null

      const size = product.features.find(f => f.id === productItem.sizeId)
      cartItem.size = size ? size : null
      cartItem.description = product.name

      const pit = await ProductHelper.getPriceByProductItem(productItem.id, SaleType.Internet, domainId)

      cartItem.price = pit.price
      cartItem.oldPrice = pit.basePrice
      cartItem.discount = pit.discount

      if(!cartItem.product){
        cartItem.product = {}
      }
      cartItem.product.url = LinkHelper.getProductUrl(product)

      total += (cartItem.price * cartItem.quantity)
    }
    else if (cartItem.packContents && cartItem.packContents.length > 0) {
      if (!cartItem.quantity)
        cartItem.quantity = 1

      const pitIds = cartItem.packContents.map(pc => {
        return pc.product.productItemId
      })
      const products = await productService.findProductsByProductItems(pitIds, domainId)

      const saleContext = {saleTypeId: SaleType.Internet, items: []};

      let total = 0
      for (var packProduct of cartItem.packContents) {

        const product = products.find(p => p.productItems.some(pit => pit.id === packProduct.product.productItemId))
        const productItem = product.productItems.find(pit => pit.id === packProduct.product.productItemId)
        const price = await productService.getPrice(product, productItem, SaleType.Internet)


        cart.totalItems += packProduct.quantity

        packProduct.product.name = product.fullName
        packProduct.product.price = 0
        packProduct.price = 0
        if (price.getFinalPrice) {
          packProduct.product.price = price.getFinalPrice().amount
          packProduct.price = price.getFinalPrice().amount
          packProduct.oldPrice = packProduct.price
          packProduct.discount = 0
        }
        packProduct.color = productService.getColor(product, productItem)
        packProduct.size = productService.getSize(product, productItem)
        packProduct.image = ProductHelper.getProductImage(product, productItem).image

        total += packProduct.price * 1;
        saleContext.items.push({
              uid: "" + productItem.id,
              quantity: 1,
              price: packProduct.price,
              productId: product.id,
              type: "PRODUCT",
              product: product
            }
        );
      }

      const oldPrice = total
      if(cartItem.type === CartItemType.Product){
        const pit = await ProductHelper.getPriceByProductItem(cartItem.product.productItemId, SaleType.Internet, domainId)
        cartItem.price = pit.price
        cartItem.oldPrice = pit.basePrice
        cartItem.discount = pit.discount

      } else if (cartItem.packId > 0) {
        const { discounts, rule } = await cartService.analyze(saleContext, cartItem.packId, domainId)
        // cartItem.discounts = discounts
        if (discounts.length > 0 && discounts[0].appliesTo) {
          cartItem.packDiscount = {
            packId: cartItem.packId,
            name: rule.name,
            price: discounts[0].price
          }
              total += discounts[0].price

          for (const appliesTo of discounts[0].appliesTo) {

            for (var packProduct of cartItem.packContents) {
              if (packProduct.product.productItemId + "" === appliesTo.uid) {
                packProduct.discount = discounts[0].price
              }
            }

          }
        }
        cartItem.price = total
        cartItem.oldPrice = oldPrice
        cartItem.discount = oldPrice - total

      }

    }

    cart.shipping = {
      cost: 0,

    }

    total = cart.items.filter(item => item).reduce((sum, it) => sum + (it.price * it.quantity) ?? 0, 0)
    cart.netTotal = total / 1.19
    cart.iva = total - cart.netTotal
    cart.total = total
    cart.financing = {
      installments: 12,
      cuota: cart.total / 12
    }


  }

  cart.items = cart.items.filter(item => item)
  cart.points = Math.round(cart.total * 0.02)
  return cart;
}


module.exports = { findCart }