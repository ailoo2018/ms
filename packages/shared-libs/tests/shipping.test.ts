import "../utils/config";
import { AttributeType, ProductType, ShoppingCart } from "../models/cart.types";
import { CartService } from "../services/CartService";
import { test, describe } from "node:test"; // Change this line
import assert from "node:assert"; // Node's built-in assertion library

const { container } = require("./container");
const { connectRedis } = require("../rdb");
const { v4: uuidv4 } = require('uuid');

test('find composite product', async () => {
  try {
    await connectRedis();
    const shippingService = container.resolve('shippingService');
    const cartService: CartService = container.resolve('cartService');

    const rows = await shippingService.listShippingMethods(1);

    // Ensure rows is what you expect (example assertion)
    assert.ok(Array.isArray(rows));

    const cart = getExampleCart();

    // Note: Ensure your cartService.save is actually async if it hits a DB/Redis
    await cartService.save(cart);

    const quotes = await cartService.listShippingQuotes(cart, 316, 1);


  } catch (e) {
    console.error(e);
    throw e; // Re-throw so the test runner actually marks the test as failed
  }
});

function getExampleCart(): ShoppingCart {
  const exampleCart: any = { // Using any temporarily if interface is missing total/shipping
    id: uuidv4(),
    wuid: uuidv4(),
    createDate: new Date().toISOString(), // Must be string per your previous interface
    modifiedDate: new Date().toISOString(),
    currency: "CLP",
    domainId: 1,
    items: [
      {
        id: uuidv4(),
        packId: 0,
        type: ProductType.Simple,
        name: "Classic Cotton T-Shirt",
        quantity: 1,
        price: 25000,
        product: {
          productItemId: 101,
          name: "Classic Cotton T-Shirt",
          type: ProductType.Simple,
          image: ""
        },
        description: "A breathable 100% cotton tee."
      }
      // ... add other items
    ]
  };

  return exampleCart as ShoppingCart;
}