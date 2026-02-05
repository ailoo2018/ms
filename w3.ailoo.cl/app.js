require("@ailoo/shared-libs/config")
const { app } = require("./server");
const logger = require("@ailoo/shared-libs/logger")

require("./routes/auth-routes");
require("./routes/account-routes");
require("./routes/categories-routes");
require("./routes/wcc-routes");
require("./routes/friendlyurl-routes");
require("./routes/events-routes");
require("./routes/cart-routes");
require("./routes/geo-routes");
require("./routes/checkout-routes");
require("./routes/orders-routes");
require("./routes/motorcycles-routes");
require("./routes/products-routes");
require("./routes/products-search-routes");
require("./routes/blog-routes");
require("./routes/stores-routes");
require("./routes/reviews-routes");
require("./routes/contact-routes");
require("./routes/invoices-routes");

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
  if(err.stack != null)
    logger.error(err.stack);
  res.status(500);
  if (!res.headersSent) {
    res.json({
      error: err.message,
      stack: err.stack,
      env: process.env.NODE_ENV});
  }
});




app.listen(app.get("port"), () => {
  console.log(`Server is running on http://localhost:${app.get("port")}`);
  console.log(`Env: ${process.env.NODE_ENV}`);
  console.log(`Env: ${process.env.ELASTICSEARCH}`);
});
module.exports = app;