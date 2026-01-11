require("@ailoo/shared-libs/config")
const { app } = require("./server");
const logger = require("@ailoo/shared-libs/logger")

require("./routes/wcc-routes");
require("./routes/friendlyurl-routes");
require("./routes/events-routes");
require("./routes/cart-routes");
require("./routes/geo-routes");
require("./routes/checkout-routes");
require("./routes/products-routes");
require("./routes/products-search-routes");

app.get('/', (req, res) => {
  logger.info("here")
  res.json({
    msg: "Welcome to the WcC App",
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PORT: process.env.DB_PORT,
    DB_DATABASE: process.env.DB_DATABASE,
    CMS_URL: process.env.CMS_URL,
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