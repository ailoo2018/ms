process.env.NODE_ENV = "developer";
import '@ailoo/shared-libs/config';
import {addPaymentToInvoice} from "../payments/confirm.payments.t.js";



import request from "supertest";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import app from "../app.js"; // Import the main app, not just the routes

describe('User API', () => {

  it('GET /:domainId/invoices/:invoiceId composite product', async () => {

    await addPaymentToInvoice(17080191, 149900, 8, "12312", 1);


    let response = await request(app)
        .get('/1/invoices/17080191')
        .expect(200)
        .expect('Content-Type', /json/);

    assert.ok(response.body);




/*
    response = await request(app)
        .post('/1/checkout/payment-result-invoice')
        .send({ paymentMethodId: 8, authorizationCode: "123123123"}) // Note: supertest uses .send() for body
        .expect(200)
        .expect('Content-Type', /json/);
*/
  });
});