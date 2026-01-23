process.env.NODE_ENV = "developer" //process.env.NODE_ENV || 'production';
require("../utils/config")

const { createContainer, asClass, asValue } = require('awilix');
const CmsService = require("../services/CmsService");
const {WebContentDb} = require("../repos/WebContentDb");


const {redisClient, connectRedis} = require("../rdb");
const {getElClient} = require("../el");
const { pool } = require('../db');
const {ProductCategoryService} = require("../services/ProductCategoryService");
const {ProductCategoryDb} = require("../repos/ProductCategoryDb");


const container = createContainer();



container.register({
  cmsService: asClass(CmsService).singleton(),
  productCategoryService: asClass(ProductCategoryService).singleton(),
  webContentDb: asClass(WebContentDb).singleton(),
  productCategoryDb: asClass(ProductCategoryDb).singleton(),

  elClient: asValue(getElClient()),
  redisClient: asValue(redisClient),
  db: asValue(pool),
});


module.exports = container