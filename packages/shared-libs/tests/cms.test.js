process.env.NODE_ENV = "developer" //process.env.NODE_ENV || 'production';
require("../utils/config")
const { createContainer, asClass, asValue } = require('awilix');
const CmsService = require("../services/CmsService");
const {WebContentDb} = require("../repos/WebContentDb");
const container = createContainer();
const {redisClient, connectRedis} = require("../rdb");
const {getElClient} = require("../el");
const { pool } = require('../db');

container.register({
  cmsService: asClass(CmsService).singleton(),
  webContentDb: asClass(WebContentDb).singleton(),

  elClient: asValue(getElClient()),
  redisClient: asValue(redisClient),
  db: asValue(pool),
});


test('find composite product', async () => {
  await connectRedis()
  const cmsService = container.resolve('cmsService');
  const page = await cmsService.findOrLoadWccAux(10018, 1)
  expect(page).not.toBeNull();
});
