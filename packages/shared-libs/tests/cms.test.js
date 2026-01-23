require("../utils/config")
const container = require("./container");
const {redisClient, connectRedis} = require("../rdb");

test('find composite product', async () => {
  await connectRedis()
  const cmsService = container.resolve('cmsService');
  const page = await cmsService.findOrLoadWccAux(10018, 1)
  expect(page).not.toBeNull();
});
