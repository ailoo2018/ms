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
const {findCart} = require("../services/cartService");

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

    let cart = null;

    const existingCart = await CartRepos.findCartByWuid(rq.wuid)
    if (existingCart) {
      if (!existingCart.items)
        existingCart.items = []
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
        items: []
      };

      const newCartId = await CartRepos.addCart(newCart)
      newCart.id = newCartId;
      cart = newCart;
    }


    let cartItem
    if (rq.type === CartItemType.Product) {

      let product = await productService.findProductByProductItem(rq.productItemId, domainId)

      if (!product) {
        return res.status(404).json({error: 'Product not found'});
      }

      const productItem = product.productItems.find(pit => pit.id = rq.productItemId)
      const prodImage = ProductService.getProductImage(product, productItem)

      if (product.productType === ProductType.Simple) {

        var existingCartItem = cart.items.find(ci => ci.product && ci.product.productItemId === productItem.id)

        if(existingCartItem){
          existingCartItem.quantity++
        }else {
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

          cart.items.push(cartItem)
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

        cart.items.push(cartItem)
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

      cart.items.push(cartItem)
    } else {
      res.status(404).json({error: 'Cart Item type not found: ' + rq.type});
    }





    await CartRepos.updateCart(cart);


    res.json(cart)

  } catch (err) {
    next(err);
  }
});



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


app.post("/:domainId/cart/update-quantity", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const wuid = req.body.wuid;
    const itemId = req.body.itemId;
    const quantity = req.body.quantity;
    const cart = await findCart(wuid, domainId);


    if(!cart) {
      res.status(404).json({
        message: "Cart not found",
        error: 'cart not found',
      });
    }

    let cartItem = cart.items.find(item => item.id === itemId)
    if(cartItem){
      cartItem.quantity = parseInt(quantity);
    }

    await CartRepos.updateCart(cart)


    res.json(cart)
  } catch (err) {
    next(err);
  }
})

