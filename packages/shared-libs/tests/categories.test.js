const container = require("./container");
const {redisClient, connectRedis} = require("../rdb");

const categoryService = container.resolve('productCategoryService');

test('product category leafs', async () => {
  await connectRedis()

  const leafs = await categoryService.leafs([9, 27], 1)
  expect(leafs).not.toBeNull();
});
