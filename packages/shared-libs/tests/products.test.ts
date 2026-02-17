import { SizeChartService } from "../services/products/SizeChartService";

process.env.NODE_ENV = 'production';
import "../utils/config";
import { test, describe } from "node:test"; // Change this line

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


test('find size chart', async () => {
    try {
        await connectRedis();
        const productsService    = container.resolve('productsService');
        const sizeChartService : SizeChartService    = container.resolve('sizeChartService');
        const product = await productsService.findProduct(2420807, 1)
        const charts = await sizeChartService.findAllThatApplyToProduct(product, 1)


        console.log("charts", charts);
    } catch (e) {
        console.error(e);
        throw e; // Re-throw so the test runner actually marks the test as failed
    }
});
