const contactsClient = require("../services/contactsClient.js");

const {
  contactMechanism,
  postalAddress,
  saleOrder,
  saleOrderItem,
  party,
  orderJournal
} = require("../db/schema.ts");
const PbxRepository = require("../el/pbx");
const {OrderItemType, SaleType, OrderState, PaymentMethodType} = require("../models/domain");
const {getPriceByProductItems} = require("../services/product-helper");
const {and, eq, sql } = require("drizzle-orm");
const logger = require("@ailoo/shared-libs/logger");
const {app} = require("../server");
const {db: drizzleDb, db} = require("../db/drizzle");
const productRepos = require("../el/products");
const ordersService = require("../services/ordersService");
const adminClient = require("../services/adminClient");
const {errors} = require("@elastic/elasticsearch");
const {confirmMercadoPagoPayment} = require("../payments/confirm.mercadopago");
const {confirmWebPay} = require("../payments/confirm.webpay");
const {CartItemType} = require("../models/cart-models");
const {findCart} = require("../services/cartService");
const retShippingMethods = {
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
  const pits = await getPriceByProductItems(items
          .filter(f => f.type === CartItemType.Product)
          .map(i => i.product.productItemId)
      , SaleType.Internet
      , domainId)

  var map = new Map();
  pits.productItems.forEach(pit => {
    if (!map.has(pit.productItemId)) {
      map.set(pit.productItemId, pit);
    }
  })

  return map;
}


app.post("/:domainId/checkout/create-order", async (req, res, next) => {

  try {
    const rq = req.body
    const domainId = parseInt(req.params.domainId);


    const result = await drizzleDb.transaction(async (tx) => {

      let user = null
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
      const pitMap = await getProductItemsMap(rq.items, domainId)

      let orderTotal = 0

      const cart = await findCart(rq.wuid, domainId)
      for (var item of cart.items) {


        if (item.type === CartItemType.Product) {

          validateRequestPrice(item, rq)

          let itemToInsert =createProductSaleOrderItem(newOrderId, item)
          const [orderItemResult] = await tx.insert(saleOrderItem).values(itemToInsert);
          const orderItemId = orderItemResult.insertId;
          if (item.packContents && item.packContents.length > 0) {
            for (var packItem of item.packContents) {
              const packItemDb =createProductSaleOrderItem(newOrderId, packItem, orderItemId)
              await tx.insert(saleOrderItem).values(packItemDb);
            }
          }

          orderTotal += item.quantity * item.price
        }
        else if(item.type === CartItemType.Pack){

          // validate price
          validateRequestPrice(item, rq)


          for (var packItem of item.packContents) {
            const packItemDb = createProductSaleOrderItem(newOrderId, packItem)
            await tx.insert(saleOrderItem).values(packItemDb);

            orderTotal += packItem.quantity * packItem.price
          }

          // add discount of pack a separate line
          if(item.packDiscount) {
            orderTotal += item.packDiscount.price
            await tx.insert(saleOrderItem).values({
              orderId: newOrderId,
              quantity: 1,
              unitPrice: item.packDiscount.price,
              unitCurrency: "CLP",
              type: OrderItemType.Discount,
              comment: item.packDiscount.name,
            });
          }

        }
      }

      return {id: orderResult.insertId, total: orderTotal, orderId: orderResult.insertId, addressId: sharedId};
    })

    res.json({id: result.orderId, total: result.total, addressId: result.addressId})
  } catch (err) {
    next(err);
  }
})

function validateRequestPrice(item, rq){
  const rqItem = rq.items.find(ri => ri.id === item.id)
  if(!rqItem)
    throw Error(`Producto no esperado en carro compra: ${item.name}`)

  if(rqItem.price !== rqItem.price) {
    throw Error(`Precio se modifico para item ${rqItem.name}`)
  }
}

function createProductSaleOrderItem(orderId, cartItem, orderItemId){
  return {
    orderId: orderId,
    productId: cartItem.product.id,            // Based on your mapping 'id' is the ProductId
    productItemId: cartItem.product.productItemId,
    quantity: cartItem.quantity.toString(), // Decimal columns expect strings in Drizzle/MySQL2
    unitPrice: cartItem.price,
    unitCurrency: "CLP",           // Default as per your table schema
    type: OrderItemType.Product,
    orderItemId: orderItemId ? orderItemId : null,
  }
}


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

  try {
    const domainId = parseInt(req.params.domainId);
    const rq = req.body
    let authcode
    let orderTotal = 0
    let confirmRs
    let gatewayResponse = null;
    let orderId = 0
    let amount = 0

    if (rq.paymentMethodType === PaymentMethodType.MercadoPago) {
      confirmRs = await confirmMercadoPagoPayment(rq.paymentId, domainId)

    } else if (rq.paymentMethodType === PaymentMethodType.Webpay) {
      confirmRs = await confirmWebPay(rq.token, domainId)

    } else {
      return res.status(500).json({success: false, error: "Tipo de pago no soportado: " + rq.paymentMethodType})
    }

    if (!confirmRs || !confirmRs.success)
      return res.status(500).json({success: false, error: confirmRs.message});
    else {
      authcode = confirmRs.authcode
      orderTotal = confirmRs.orderTotal
      gatewayResponse = confirmRs.gatewayResponse
      orderId = confirmRs.orderId
      amount = confirmRs.amount
    }

    await drizzleDb.transaction(async (tx) => {
      await tx
          .update(saleOrder)
          .set({
            authCode: authcode, // Ensure property name matches your req
            state: OrderState.Pagado, // Ensure property name matches your req
          })
          .where(
              and(
                  eq(saleOrder.id, orderId),
                  eq(saleOrder.domainId, domainId)
              )
          );

      await tx.insert(orderJournal).values({
        orderId: orderId,
        description: `Order paid successfully. AuthCode: ${authcode}`,
        state: OrderState.Pagado,
        creationDate: new Date(),
        userId: sql`NULL`,
      });
    })

    try {
      await adminClient.paymentValidated(rq.orderId, authcode, domainId)
    } catch (e) {
      logger.error("Unable to notify payment validated to admin: " + e.message)
    }


    res.json({
      success: true,
      orderId: orderId,
      orderTotal: amount,
      paymentDate: new Date(),
      newState: OrderState.Pagado,
      authorization: authcode,
      gatewayResponse,
    });

  } catch (e) {
    res.json({
      success: false,
      error: e.message,
      message: e.message,
    });

  }


})
