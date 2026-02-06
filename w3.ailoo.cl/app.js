import logger from "@ailoo/shared-libs/logger";
import generated from "@ailoo/shared-libs/config";


import authRoutes from "./routes/auth-routes.js";
app.use(authRoutes);
import accountRoutes from "./routes/account-routes.js";
app.use(accountRoutes);

import categoriesRoutes from "./routes/categories-routes.js";
app.use(categoriesRoutes);


import wccRoutes from "./routes/wcc-routes.js";
app.use(wccRoutes);
import friendlyUrlRoutes from "./routes/friendlyurl-routes.js";
app.use(friendlyUrlRoutes);



import {app} from "./server.js";


import eventsRoutes from "./routes/events-routes.js";
app.use(eventsRoutes);
import cartRoutes from "./routes/cart-routes.js";
app.use(cartRoutes);
import geoRoutes from "./routes/geo-routes.js";
app.use(geoRoutes);
import checkoutRoutes from "./routes/checkout-routes.js";
app.use(checkoutRoutes);
import ordersRoutes from "./routes/orders-routes.js";
app.use(ordersRoutes);
import motorcyclesRoutes from "./routes/motorcycles-routes.js";
app.use(motorcyclesRoutes);
import productsRoutes from "./routes/products-routes.js";
app.use(productsRoutes);

import testRoutes from "./routes/test-routes.ts";
app.use(testRoutes);



import productsSearchRoutes from "./routes/products-search-routes.js";
app.use(productsSearchRoutes);
import blogRoutes from "./routes/blog-routes.js";
app.use(blogRoutes);

import storesRoutes from "./routes/stores-routes.js";
app.use(storesRoutes);
import reviewRoutes from "./routes/reviews-routes.js";
app.use(reviewRoutes);
import contactRoutes  from "./routes/contact-routes.js";
app.use(contactRoutes);
import invoicesRoutes from "./routes/invoices-routes.js";
app.use(invoicesRoutes);
import paymentsRoutes from "./routes/routes.payment.confirm.ts";
app.use(paymentsRoutes);

app.get('/', (req, res) => {
  logger.info("here")
  res.json({
    msg: "Welcome to the WcC App",
    /*
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_PORT: process.env.DB_PORT,
        DB_DATABASE: process.env.DB_DATABASE,
    */

    CMS_URL: process.env.CMS_URL,
    MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    WEBPAY_COMMERCE_CODE: process.env.WEBPAY_COMMERCE_CODE,
    //  AILOO_TOKEN: process.env.AILOO_ACCESS_TOKEN,
    ADMIN_URL: process.env.ADMIN_URL,
  });
});


app.use((err, req, res, next) => {
  logger.error("Error in express handler: " + err);
  if (err.stack != null)
    logger.error(err.stack);
  res.status(500);
  if (!res.headersSent) {
    res.json({
      error: err.message,
      stack: err.stack,
      env: process.env.NODE_ENV
    });
  }
});


app.listen(app.get("port"), () => {
  console.log(`Server is running on http://localhost:${app.get("port")}`);
  console.log(`Env: ${process.env.NODE_ENV}`);
  console.log(`Env: ${process.env.ELASTICSEARCH}`);
});

export default app

