const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello World! w3.ailoo.cl v3.3.3.3.3 ');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});