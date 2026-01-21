const {app} = require("../server");
const cmsClient = require("../services/cmsClient");
const {getElClient} = require("../connections/el");
const {CartItemType} = require("../models/cart-models");
const CartRepos = require("../el/cart");
const {findProductByProductItem} = require("../el/products");
const ProductService = require('../services/product-helper');
const {SaleType, ProductType} = require("../models/domain");
const container = require("../container");
const {getProductImage} = require("../services/product-helper");
const {v4: uuidv4} = require('uuid');

const productService = container.resolve('productsService');
const cartService = container.resolve('cartService');


app.get("/:domainId/cart/remove-item", async (req, res, next) => {

  try {
    const domainId = parseInt(req.params.domainId);
    const {wuid, itemId, type} = req.query

    const cart = await CartRepos.findCartByWuid(wuid)
    cart.items = cart.items.filter(ite => ite).filter(item => item.id !== itemId   && item.type !== type)

    await CartRepos.updateCart(cart)

    const newCart = await findCart(wuid, domainId);
    res.json(newCart)


  } catch (err) {
    next(err);
  }

})

app.post('/:domainId/cart/add', async (req, res, next) => {

  const rq = req.body;

  try {

    const domainId = parseInt(req.params.domainId);

    let cartItem
    if (rq.type === CartItemType.Product) {

      let product = await productService.findProductByProductItem(rq.productItemId, domainId)

      if (!product) {
        return res.status(404).json({error: 'Product not found'});
      }

      const productItem = product.productItems.find(pit => pit.id = rq.productItemId)
      const prodImage = ProductService.getProductImage(product, productItem)

      if (product.productType === ProductType.Simple) {


        cartItem = {
          id: uuidv4(),
          packId: 0,
          name: ProductService.getProductItemDescription(product, productItem),
          product: {
            productItemId: productItem.id,
            image: prodImage ? prodImage.image : null,
            name: ProductService.getProductItemDescription(product, productItem),
            type: product.productType,
          },
          quantity: rq.quantity,
          type: CartItemType.Product,
        }
      } else {

        cartItem = {
          id: uuidv4(),
          packId: 0,
          name: ProductService.getProductItemDescription(product, productItem),
          product: {
            productItemId: productItem.id,
            image: prodImage ? prodImage.image : null,
            name: ProductService.getProductItemDescription(product, productItem),
            type: product.productType,
          },
          quantity: rq.quantity,
          type: CartItemType.Product,
          packContents: []
        }

        for (var packItem of rq.packContents) {

          var packProduct = await productService.findProductByProductItem(packItem.productItemId, domainId)
          const packPit = packProduct.productItems.find(pit => pit.id = packItem.productItemId)
          if (packPit == null) {
            return res.status(404).json({error: 'ProductItem not found: ' + packItem.productItemId});
          }

          const packItemImage = ProductService.getProductImage(packProduct, packPit)

          cartItem.packContents.push({
            "packId": 0,
            "product": {
              "productItemId": packPit.id,
              "image": packItemImage ? packItemImage.image : null,
              "name": packProduct.name,
              "id": packProduct.id,
            },
            "quantity": 1,
            "name": packProduct.fullName,
            "id": packPit.id,
            "type": 0
          })
        }
      }

    } else if (rq.type === CartItemType.Pack) {
      cartItem = {
        id: uuidv4(),
        packId: rq.packId,
        type: CartItemType.Pack,
        name: rq.name,
        product: null,
        packContents: rq.packContents.map(pc => {
          return {
            quantity: pc.quantity,
            product: {
              id: pc.productId,
              productItemId: pc.productItemId,
            }
          }
        })
      }
    } else {
      res.status(404).json({error: 'Cart Item type not found: ' + rq.type});
    }

    var cart = rq;

    const existingCart = await CartRepos.findCartByWuid(rq.wuid)
    if (existingCart) {
      if (!existingCart.items)
        existingCart.items = []
      existingCart.items.push(cartItem)
      await CartRepos.updateCart(existingCart);
      cart = existingCart;
    } else {

      const newCart = {
        "id": null,
        "wuid": rq.wuid,
        "notificationsCount": 0,
        "lastNotified": "0001-01-01T00:00:00",
        "webSiteId": 0,
        "createDate": new Date(),
        "modifiedDate": new Date(),
        "currency": rq.currency ? rq.currency : "CLP",
        "userId": rq.userId ? rq.userId : 0,
        "domainId": domainId,
        items: [cartItem]
      };

      const newCartId = await CartRepos.addCart(newCart)
      newCart.id = newCartId;
      cart = newCart;
    }


    res.json(cart)

  } catch (err) {
    next(err);
  }
});


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
      const img = ProductService.getProductImage(product, productItem)
      if (img)
        cartItem.image = img.image

      cart.totalItems += cartItem.quantity

      const color = product.features.find(f => f.id === productItem.colorId)
      cartItem.color = color ? color : null

      const size = product.features.find(f => f.id === productItem.sizeId)
      cartItem.size = size ? size : null
      cartItem.description = product.name

      const pit = await ProductService.getPriceByProductItem(productItem.id, SaleType.Internet, domainId)

      cartItem.price = pit.price
      cartItem.oldPrice = pit.basePrice
      cartItem.discount = pit.discount

      total += cartItem.price
    } else if (cartItem.packContents && cartItem.packContents.length > 0) {
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
        packProduct.product.name = product.fullName

        cart.totalItems += packProduct.quantity

        const price = await productService.getPrice(product, productItem, SaleType.Internet)
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
        packProduct.image = ProductService.getProductImage(product, productItem).image

        total += packProduct.price
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
        const pit = await ProductService.getPriceByProductItem(cartItem.product.productItemId, SaleType.Internet, domainId)
        cartItem.price = pit.price
        cartItem.oldPrice = pit.basePrice
        cartItem.discount = pit.discount

      } else if (cartItem.packId > 0) {
        const discounts = await cartService.analyze(saleContext, cartItem.packId, domainId)
        // cartItem.discounts = discounts
        if (discounts.length > 0 && discounts[0].appliesTo) {
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

    total = cart.items.filter(item => item).reduce((sum, it) => sum + it.price ?? 0, 0)
    cart.netTotal = total / 1.19
    cart.iva = total - cart.netTotal
    cart.total = total
    cart.financing = {
      installments: 12,
      cuota: cart.total / 12
    }


  }

  cart.items = cart.items.filter(item => item)
  return cart;
}

app.get("/:domainId/cart/:wuid", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const wuid = req.params.wuid;
    const cart = await findCart(wuid, domainId);
    if(!cart) {
      res.status(404).json({
        message: "Cart not found",
        error: 'cart not found',
      });
    }

    res.json(cart)
  } catch (err) {
    next(err);
  }
})

