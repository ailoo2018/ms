const express = require('express');
const logger = require("@ailoo/shared-libs/logger")
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  logger.info('App started on port: ' + PORT);
  res.send('Hello World! w3.ailoo.cl v3.3.3.3.5 ');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});