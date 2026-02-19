process.env.NODE_ENV = "production";
import '@ailoo/shared-libs/config';

import {db as drizzleDb} from "../db/drizzle.js";


import {and, eq, sql} from "drizzle-orm";
import schema from "../db/schema.js";
const {saleOrder, orderJournal, payment, paymentApplication} = schema

import request from "supertest";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import app from "../app.js"; // Import the main app, not just the routes

describe('User API', () => {

  it('GET /:domainId/invoices/:invoiceId composite product', async () => {

    try {
      let invoiceId = 27942086

      const results = await drizzleDb
          .select({
            payment: payment,
          })
          .from(paymentApplication)
          .innerJoin(
              payment,
              eq(paymentApplication.paymentId, payment.id)
          )
          .where(eq(paymentApplication.invoiceId, invoiceId));

      const payments = results.map(r => r.payment);
    }catch(e){
      console.error(e);
    }



/*
    response = await request(app)
        .post('/1/checkout/payment-result-invoice')
        .send({ paymentMethodId: 8, authorizationCode: "123123123"}) // Note: supertest uses .send() for body
        .expect(200)
        .expect('Content-Type', /json/);
*/
  });
});