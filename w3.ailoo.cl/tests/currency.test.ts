import * as assert from "node:assert";
import '../utils/config.js';


import request from "supertest";
import {describe, it} from "node:test";

import {app} from "../server.js"; // Import the main app, not just the routes
import productRoutes from "../routes/products/products.routes.js";




describe('User API', () => {


    it('GET product', async () => {

        app.use(productRoutes);

        let resp = await request(app)
            .get('/1/products/2356895')
            .set({
                'X-Currency': 'ARS',
                'Authorization': 'Bearer token123'
            })

        assert.ok(resp);


    });

});