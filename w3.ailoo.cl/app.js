require("@ailoo/shared-libs/config")

const express = require('express');
const logger = require("@ailoo/shared-libs/logger")

const {findWidget} = require("./db/webcontent");
const app = express();
app.set("port", process.env.PORT || 3000);

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


app.get('/', (req, res) => {
  res.json({
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PORT: process.env.DB_PORT,
    DB_DATABASE: process.env.DB_DATABASE,
  });
});


app.get('/:domainId/wcc/:id', async (req, res, next) => {

  try{
    const id = parseInt(req.params.id);
    const domainId = parseInt(req.params.domainId);

    const wcc = await findWidget(id, domainId);

    res.json(wcc)
  }catch(err){
    next(err)
  }

});

app.listen(app.get("port"), () => {
  console.log(`Server is running on http://localhost:${app.get("port")}`);
});