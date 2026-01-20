process.env.NODE_ENV = "production" //process.env.NODE_ENV || 'production';
require("@ailoo/shared-libs/config")


const container = require("../container");
const app = require("../app");
const productHelper = require("../services/product-helper");
const request = require('supertest');

test('find composite product', async () => {
  const result = await productHelper.findProduct(3212224, 1)
  expect(result.composite.length).toBe(2);
});

describe('User API', () => {
  test('GET /:domainId/products/:productId composite product', async () => {
    const response = await request(app)
        .get('/1/products/3212224')
        .expect(200)
        .expect('Content-Type', /json/);

    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.id).toBe(3212224);
  });
})