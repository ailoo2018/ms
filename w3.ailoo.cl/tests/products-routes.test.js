process.env.NODE_ENV = "production" //process.env.NODE_ENV || 'production';
require("@ailoo/shared-libs/config")
const {and, eq, sql } = require("drizzle-orm");

const container = require("../container");
const app = require("../app");
const productHelper = require("../services/product-helper");
const request = require('supertest');
const {db: drizzleDb} = require("../db/drizzle");

test('drizzle', async (t) => {
  try {
    const a = 1 + 1
    const order = await drizzleDb.query.saleOrder.findFirst({
      where: (saleOrder, {eq}) =>
          and(
              eq(saleOrder.id, 190894),
              eq(saleOrder.domainId, 1),
          ),
      with: {
        items: {
          columns: {
            productItemId: true,
          },
          with: {
            product: {
              with: {
                brand: true,
                model: true,
              }
            }
          }
        },
        customer: {
          columns: {
            id: true,
            name: true,
          }
        },
        destinationFacility: {
          columns: {
            id: true,
            name: true,
          }
        },
        shippingAddress: {
          with: {
            comuna: {
              id: true,
              name:true,
            }
          }

        }
      },
    });

    console.log(order)
  }catch(e){
    console.log(e);
  }

})

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