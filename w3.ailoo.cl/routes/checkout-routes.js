const contactsClient = require( "../services/contactsClient.js");

const {contactMechanism, postalAddress, saleOrder, saleOrderItem, party} = require("../db/schema.ts");
const PbxRepository = require("../el/pbx");
const { OrderItemType, SaleType } = require("../models/domain");
const { getPriceByProductItem } = require("../services/product-helper");
const { and, eq } = require("drizzle-orm");
const logger = require("@ailoo/shared-libs/logger");
const { app } = require("../server");
const { db: drizzleDb, db} = require("../db/drizzle");
const productRepos = require("../el/products");

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


async function getPartyPartial(email, domainId) {
  const [result] = await drizzleDb
      .select({
        id: party.id,
        name: party.name,
        rut: party.rut
      })
      .from(party)
      .where(
          and(
              eq(party.email, email),
              eq(party.domainId, domainId)
          )
      )
      .limit(1);

  return result ?? null;
}

async function getProductItemsMap(items, domainId) {
  const pits = await getPriceByProductItem(items.map(i=> i.id), SaleType.Internet, domainId)

  var map = new Map();
  pits.productItems.forEach(pit => {
    if(!map.has(pit.productItemId)){
      map.set(pit.productItemId, pit);
    }
  })

  return map;
}


app.post("/:domainId/checkout/create-order", async (req, res, next) => {

  try{
    const rq =  req.body
    const domainId = parseInt(req.params.domainId);

    const result = await drizzleDb.transaction(async (tx) => {


      let user = null
      let userParty = null
      let person = null;

      if (rq.userId > 0) {
        user = await db.query.user.findFirst({
          where: eq(user.id, userId),
          with: {
            person: true, // This joins the 'party' table
          },
        });
      }

      if (user != null && user.person != null)
        person = user.person;

      if (person == null)
        person = await getPartyPartial(rq.customerInformation.email, domainId);

      if (person == null) {
        const [result] = await tx.insert(party).values({
          name: rq.customerInformation.address.name,
          firstName: rq.customerInformation.address.name,
          lastName: rq.customerInformation.address.surnames,
          email: rq.customerInformation.email,
          comuna: rq.customerInformation.phone,
          rut: rq.customerInformation.address.rut,
          phone: rq.customerInformation.address.phone,
          createDate: new Date(),
          type: "PERSON", // Matches your varchar(20) 'Type' column
          receiveNewsletter: 1,
          domainId: domainId,
        });

        person = result
        logger.info("Person does not exist. Creating person for email " + rq.customerInformation.email +
            ". The partyId is " + person.id);
        await contactsClient.index(person.id, domainId);
      }


        await PbxRepository.updateParty(rq.customerInformation.phone, person.id, person.name,
            person.email, domainId);


      const [cmResult] = await tx.insert(contactMechanism).values({});
      const sharedId = cmResult.insertId;

      await tx.insert(postalAddress).values({
        postalAddressId: sharedId, // Use the shared ID
        name: rq.shipmentInformation.address.name.trim(),
        surname: rq.shipmentInformation.address.surnames,
        address: rq.shipmentInformation.address.address,
        address2: rq.shipmentInformation.address.address2,
        notifyWhatsApp: rq.notifyWhatsApp,
        rut: rq.shipmentInformation.address.rut,
        email: rq.customerInformation.email,
        comment: rq.shipmentInformation.notes,
        comunaId: rq.shipmentInformation.address.comuna.id,
        postalCode: rq.shipmentInformation.address.postalCode,
        domainId: domainId
      });

      const [orderResult] = await tx.insert(saleOrder).values({
        orderDate: new Date(),
        expectedDeliveryDate: new Date(),
        shippedToId: sharedId, // Points to both tables via the shared ID
        state: 1,
        paymentMethodTypeId: rq.paymentMethod.gateway,
        shipmentMethodTypeId: null,
        orderedBy: person.id,
        invoicedTo: null, // todo datos de factura
        domainId: domainId
      });

      const newOrderId = orderResult.insertId;


      const itemsToInsert = []

      const pitMap = await getProductItemsMap(rq.items, domainId)

      for (var item of rq.items) {
        if (item.type === OrderItemType.Product) {

          const pitSm = (pitMap).get(item.id)
          if(pitSm == null) {
            throw new Error(`Product not found: ${item.id}`)
          }

          if(item.price !== pitSm.price){
            throw new Error(`El precios de la variante ${item.id} se modifico: ${item.price} vs ${pitSm.price}`)
          }

          let itemToInsert = {
            orderId: newOrderId,
            productId: pitSm.productId,            // Based on your mapping 'id' is the ProductId
            productItemId: item.id,
            quantity: item.quantity.toString(), // Decimal columns expect strings in Drizzle/MySQL2
            unitPrice: item.price,
            unitCurrency: "CLP",           // Default as per your table schema
            type: OrderItemType.Product,
          }

          itemsToInsert.push(itemToInsert);
        }

      }


      await tx.insert(saleOrderItem).values(itemsToInsert);

      return {orderId: orderResult.insertId, addressId: sharedId};

    })


    // save order to db

    res.json({orderId: result.orderId, addressId: result.addressId})
  } catch (err) {
    next(err);
  }
})

app.get("/:domainId/checkout/payment-methods", async (req, res, next) => {
  try {
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
  } catch (e) {
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

app.post("/:domainId/checkout/payment-result", async (req, res, next) => {

  try{
    const domainId = parseInt(req.params.domainId);
    const rq = req.body

    const result = await drizzleDb.query.saleOrder.findFirst({
      where: (saleOrder, { eq }) =>
          and(
            eq(saleOrder.id, rq.orderId),
            eq(saleOrder.domainId, rq.domainId),
          ),

      with: {
        items: true,
      },
    });


    res.json(result)

  }catch(e){
    next(e)
  }


})
