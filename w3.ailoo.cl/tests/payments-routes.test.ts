import * as assert from "node:assert";
import '../utils/config.js';


import request from "supertest";
import {describe, it} from "node:test";

import {app} from "../server.js"; // Import the main app, not just the routes
import settingsRoutes from "../routes/account/settings/settings.routes.js";
import wishlistRoutes from "../routes/account/wishlist/wishlist.routes.js";



describe('User API', () => {


    it('GET /:domainId/wishlist composite product', async () => {
        app.use(wishlistRoutes);
        app.use(settingsRoutes);

        let resp = await request(app)
            .post('/1/account/create')
            .send({
                fname: "Pepe",
                lname: "Test",
                email: "test2342_2@test.com",
                password: "123456"
            })

        assert.ok(resp);


        resp = await request(app)
            .get('/1/wishlist')
            .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJqY2Z1ZW50ZXNAbGF2YS5jbCIsInBhcnR5SWQiOjIzOCwiaWF0IjoxNzcxNjAyMDUwLCJleHAiOjE3NzQxOTQwNTB9.uJD9P4f6R_l5WBxVyLnRBF7qmRaVLgyPpJwXVYrhGJI")
            .expect(200)
            .expect('Content-Type', /json/);

    });

});