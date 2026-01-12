const {app} = require("../server");
const cmsClient = require("../services/cmsClient");
const {getElClient} = require("../el");
const {CartItemType} = require("../models/cart-models");
const CartRepos = require("../el/cart");
const {findProductByProductItem} = require("../el/products");
const ProductService = require( '../services/product-helper' );
const {SaleType} = require("../models/domain");



app.get("/:domainId/cart/remove-item", async (req, res, next) => {

  try{
    const { wuid, itemId, type} = req.query
    const id = parseInt(itemId)
    const cart = await CartRepos.findCartByWuid(wuid)
    cart.items = cart.items.filter(item => item.id !== id && item.type !== type)

    await CartRepos.updateCart(cart)

    res.json(cart)


  }catch(err){
    next(err);
  }

})

app.post('/:domainId/cart/add', async (req, res, next) => {

  const rq = req.body;

  try {

    const domainId = parseInt(req.params.domainId);

    let cartItem
    if(rq.type === CartItemType.Product) {
      const product = await findProductByProductItem(rq.productItemId, domainId)
      if(!product) {
        return res.status(404).json({error: 'Product not found'});
      }

      const productItem = product.productItems.find(pit => pit.id = rq.productItemId)
      const prodImage = ProductService.getProductImage(product, productItem)
      cartItem = {
        id: productItem.id,
        packId: 0,
        product: {
          productItemId: productItem.id,
          image: prodImage ? prodImage.image : null,
          name: ProductService.getProductItemDescription(product, productItem),
        },
        quantity: rq.quantity,
        type: CartItemType.Product,
      }

    }


    var cart = rq;
    if (rq.id != null && rq.id != "") {

      const existingCart = await CartRepos.findCart(rq.id)
      if(!existingCart) {
        return res.status(404).json({error: "Cart not found or could not be updated"});
      }

      existingCart.items.push(cartItem);
      await CartRepos.updateCart(existingCart);

      res.json(existingCart);
    } else {

      const existingCart = await CartRepos.findCartByWuid(rq.wuid)
      if(existingCart){
        if(!existingCart.items)
          existingCart.items = []
        existingCart.items.push(cartItem)
        await CartRepos.updateCart(existingCart);
        cart = existingCart;
      }else {

        const newCart ={
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
          items: [ cartItem ]
        };

        const newCartId = await CartRepos.addCart(newCart)
        newCart.id = newCartId;
        cart = newCart;
      }

    }


    res.json(cart)

  } catch (err) {
    next(err);
  }

  res.json({});
});



app.get("/:domainId/cart/:wuid", async (req, res, next) => {
  try{
    const domainId = parseInt(req.params.domainId);

    const cart = await CartRepos.findCartByWuid(req.params.wuid)
    if(!cart){
      return res.status(404).json({
        message: "Cart not found",
        error: 'cart not found',
      });
    }

    cart.oldPrice = 0
    cart.shipping = { cost: 0}
    cart.financing = { installments: 1}
    cart.itemsQuantity = 0

    let total = 0
    for(const cartItem of cart.items) {

      if(cartItem.type == CartItemType.Product) {
        const product = await findProductByProductItem(cartItem.id, domainId)
        const productItem = product.productItems.find(pit => pit.id === cartItem.id);
        const img = ProductService.getProductImage(product, productItem)
        if(img)
          cartItem.image = img.image

        const color = product.features.find(f => f.id === productItem.colorId)
        cartItem.color = color ? color : null

        const size = product.features.find(f => f.id === productItem.sizeId)
        cartItem.size = size ? size : null
        cartItem.description = product.name

        const pits = await ProductService.getPriceByProductItem([ productItem.id ], SaleType.Internet, domainId )

        cartItem.price = pits.productItems[0].price
        cartItem.oldPrice = pits.productItems[0].basePrice
        cartItem.discount = pits.productItems[0].discount

        total += cartItem.price
      }

      cart.shipping = {
        cost: 0,

      }

      cart.netTotal =  total / 1.19
      cart.iva =  total - cart.netTotal
      cart.total = total
      cart.financing = {
        installments: 12,
        cuota: cart.total / 12
      }


    }

    res.json(cart)
  }catch(err){
    next(err);
  }
})

