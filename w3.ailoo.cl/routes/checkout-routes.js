const {app} = require("../server");


var retShippingMethods = {
  "destination": {
    "comuna": {
      "id": 316
    }
  },
  "methods": [
    {
      "id": 13,
      "name": "Alas Express",
      "price": 0.0,
      "oldPrice": 0.0,
      "estimatedDays": 0,
      "eta": {
        "from": "2026-01-15T00:00:00-03:00",
        "to": "2026-01-16T00:00:00-03:00"
      },
      "type": 2
    },
    {
      "id": 9,
      "name": "Retiro en Tienda",
      "price": 0.0,
      "oldPrice": 0.0,
      "estimatedDays": 0,
      "eta": {
        "from": "2026-01-15T00:00:00-03:00",
        "to": "2026-01-16T00:00:00-03:00"
      },
      "type": 1
    }
  ]
}


/**
 * TODO
 */
app.get("/:domainId/shipping/methods", async (req, res, next) => {
  try {
      const domainId = parseInt(req.params.domainId);

      res.json(retShippingMethods)
  } catch (e) {
    next(e)
  }

})


/**
 * TODO
 */
app.get("/:domainId/shipping/set-carrier", async (req, res, next) => {
  try {
      const carrierId = parseInt(req.params.carrierId);

      res.json(carrierId)
  } catch (e) {
    next(e)
  }

})


/**
 * TODO
 */
app.post("/:domainId/checkout/create-order", async (req, res, next) => {

  try{
    res.json({})
  }catch(err){
    next(err);
  }
})
app.get("/:domainId/checkout/payment-methods", async (req, res, next) => {
  try{
    res.json({
      "gateways": [
        {
          "id": 8,
          "driver": "webpay",
          "description": null,
          "logo_class": "credit-cards",
          "name": "webpay",
          "order": 1
        },
        {
          "id": 15,
          "driver": "mercadopago",
          "description": null,
          "logo_class": "mercadopago",
          "name": "mercadopago",
          "order": 2
        }
      ]
    })
  }catch (e){
    next(e)
  }
})
app.get("/:domainId/checkout/click-collect", async (req, res, next) => {
  try {

    res.json({
      "stores": [
        {
          "id": 1,
          "title": "LAS TRANQUERAS (LAS CONDES)",
          "name": "LAS TRANQUERAS",
          "address": "LAS TRANQUERAS 56",
          "latitude": -33400898749676832.0,
          "longitude": -7055551688038699.0,
          "comuna": {
            "id": 316,
            "name": "LAS CONDES"
          }
        },
        {
          "id": 3,
          "title": "LIRA (SANTIAGO)",
          "name": "LIRA",
          "address": "LIRA 689",
          "latitude": -334519330807735.0,
          "longitude": -7064047278430553.0,
          "comuna": {
            "id": 344,
            "name": "SANTIAGO"
          }
        },
        {
          "id": 4228,
          "title": "ARGOMEDO (SANTIAGO)",
          "name": "ARGOMEDO",
          "address": "Lira 588",
          "latitude": -334501501.0,
          "longitude": -706407409.0,
          "comuna": {
            "id": 344,
            "name": "SANTIAGO"
          }
        },
        {
          "id": 4597,
          "title": "MX primer piso (LAS CONDES)",
          "name": "MX primer piso",
          "address": "Las Tranqueras 56, Primer Piso",
          "latitude": -3340105625503981.0,
          "longitude": -7055555322864296.0,
          "comuna": {
            "id": 316,
            "name": "LAS CONDES"
          }
        }
      ]
    })
  } catch (e) {
    next(e)
  }

})