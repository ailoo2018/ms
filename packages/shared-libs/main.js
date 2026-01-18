require('dotenv').config();
const {getPrice} = require( "./products/price");
const ProductsService = require("./services/ProductsService");
const { createContainer, asClass, asValue } = require('awilix');
const {getElClient} = require("./el");
const {SaleType} = require("./models");
const {ProductCategoryService} = require("./services/ProductCategoryService");
const { ProductCategoryDb } = require("./repos/ProductCategoryDb");
const { pool } = require("./db");
const redis = require("redis");
const {DiscountRuleService} = require("./services/DiscountRuleService");
const container = createContainer();

process.env.ELASTICSEARCH="http://localhost:9200"
process.env.REDIS_CONNECTION_STRING="redis://localhost:6379"

const db = redis.createClient({
  url: process.env.REDIS_CONNECTION_STRING,
  socket: {
    connectTimeout: 30000,  // Increase timeout to 30 seconds
    keepAlive: 30000,       // Keep connections alive
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Max reconnection attempts reached');
      return Math.min(retries * 100, 3000); // Exponential backoff
    }
  }
});
db.connect().then(function (            ) {
  console.log("connected redis: " + process.env.REDIS_CONNECTION_STRING)
});


container.register({
  productsService: asClass(ProductsService).singleton(),
  productCategoryService: asClass(ProductCategoryService).singleton(),
  productCategoryDb: asClass(ProductCategoryDb).singleton(),
  discountRuleService: asClass(DiscountRuleService).singleton(),

  elClient: asValue(getElClient()),
  redisClient: asValue(db),
  db: asValue(pool),
});

( async () => {
  console.log("hello world")

  const productsService = container.resolve('productsService');
  const product = await productsService.findProduct(2356895, 1)
  await productsService.getPrice(product, product.productItems[0], SaleType.Internet, "CLP")

})()