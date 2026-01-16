const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require('jsonwebtoken');


const app = express();

const validateJWT = (req, res, next) => {

  if(process.env.NODE_ENV === "test") {
    next();
    return;
  }

  // Get the auth header value
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];


  if (token == null) return res.sendStatus(403); // if there's no token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    req.user = user;
    next();
  });
};


app.use(express.json({limit: '50mb'}));
app.set("port", process.env.PORT || 3000);

app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({limit: '50mb', extended: true}));


module.exports.app=app;
module.exports.validateJWT=validateJWT;