const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();



app.use(express.json({limit: '50mb'}));
app.set("port", process.env.PORT || 3000);

app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({limit: '50mb', extended: true}));


module.exports.app=app;