process.env.NODE_ENV = "production" //process.env.NODE_ENV || 'production';
require("@ailoo/shared-libs/config")

const app = require("../app");
const request = require('supertest');
const assert = require( "node:assert/strict"); // Node's built-in assertion library

describe('User API', () => {
  test('GET /:domainId/invoices/:invoiceId composite product', async () => {
    const response = await request(app)
        .get('/1/invoices/27759764')
        .expect(200)
        .expect('Content-Type', /json/);

   assert.ok(response.body);
  });
})