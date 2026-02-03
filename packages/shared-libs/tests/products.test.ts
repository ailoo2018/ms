process.env.NODE_ENV = 'production';
import "../utils/config";
import { AttributeType, ProductType, ShoppingCart } from "../models/cart.types";
import { CartService } from "../services/CartService";
import { test, describe } from "node:test"; // Change this line
import assert from "node:assert"; // Node's built-in assertion library

const ProductService = require( "../services/ProductsService");

const { container } = require("./container");
const { connectRedis } = require("../rdb");


test('find composite product', async () => {
    try {
        await connectRedis();
        const productsService    = container.resolve('productsService');
        const product = await productsService.findProductWithInventory(2993050, 1)

        console.log("product")
    } catch (e) {
        console.error(e);
        throw e; // Re-throw so the test runner actually marks the test as failed
    }
});
