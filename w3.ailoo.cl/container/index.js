const { createContainer, asClass, asValue } = require('awilix');

const ProductsService = require("@ailoo/shared-libs/ProductsService")
const { DiscountRuleService } = require("@ailoo/shared-libs/DiscountRuleService")
const { ProductCategoryService } = require("@ailoo/shared-libs/ProductCategoryService")
const  CartService  = require("@ailoo/shared-libs/CartService")

const { ProductCategoryDb } = require("@ailoo/shared-libs/ProductCategoryDb")
const { pool } = require('../connections/mysql');
const {getElClient} = require("../connections/el");
const {db: redisDb} = require("../connections/rdb");

const container = createContainer();


container.register({
  productsService: asClass(ProductsService).singleton(),
  productCategoryService: asClass(ProductCategoryService).singleton(),
  discountRuleService: asClass(DiscountRuleService).singleton(),
  cartService: asClass(CartService).singleton(),

  productCategoryDb: asClass(ProductCategoryDb).singleton(),

  elClient: asValue(getElClient()),
  redisClient: asValue(redisDb),
  db: asValue(pool),
});


module.exports = container;