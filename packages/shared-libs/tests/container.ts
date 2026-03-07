require("../utils/config")

const { createContainer, asClass, asValue } = require('awilix');
const CmsService = require("../services/CmsService");
const {WebContentDb} = require("../repos/WebContentDb");
const ProductsService = require("../services/ProductsService")

const {redisClient, connectRedis} = require("../rdb");
const {getElClient} = require("../el");
const { pool } = require('../db');
const {ProductCategoryService} = require("../services/ProductCategoryService");
const {ProductCategoryDb} = require("../repos/ProductCategoryDb");
const { ShippingService } = require("../services/ShippingService");

const { CartService } = require( "../services/CartService");
const  { SizeChartService }  = require( "../services/products/SizeChartService");
const { CartRepos } = require( "../repos/CartRepos");
const {DiscountRuleService} = require("../services/DiscountRuleService");


const container = createContainer();



container.register({
    productsService: asClass(ProductsService).singleton(),
    cartService: asClass(CartService).singleton(),
    discountRuleService: asClass(DiscountRuleService).singleton(),
    shippingService: asClass(ShippingService).singleton(),
    cmsService: asClass(CmsService).singleton(),
    productCategoryService: asClass(ProductCategoryService).singleton(),
    webContentDb: asClass(WebContentDb).singleton(),
    productCategoryDb: asClass(ProductCategoryDb).singleton(),
    sizeChartService: asClass(SizeChartService).singleton(),
    cartRepository: asClass(CartRepos).singleton(),


    elClient: asValue(getElClient()),
    redisClient: asValue(redisClient),
    db: asValue(pool),
});


module.exports.container = container