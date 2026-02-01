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
const {getPriceByProductItems, getProductItemDescription, getFeaturesDescription} = require("../services/product-helper");
const {and, eq, sql } = require("drizzle-orm");
const logger = require("@ailoo/shared-libs/logger");
const ProductImageHelper = require("@ailoo/shared-libs/helpers/ProductImageHelper")
const {app} = require("../server");
const {db: drizzleDb, db} = require("../db/drizzle");
const adminClient = require("../services/adminClient");
const {confirmMercadoPagoPayment} = require("../payments/confirm.mercadopago");
const {confirmWebPay} = require("../payments/confirm.webpay");
const {CartItemType} = require("../models/cart-models");
const {findCart} = require("../services/cartService");
const ejs = require('ejs');
const path = require('path');
const {stockByStore} = require("../db/inventory");
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
const container = require("../container");
const cartService = container.resolve("cartService");


app.get("/:domainId/shipping/methods", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const wuid = req.query.wuid;



    const cart = await findCart(wuid, domainId)
    if(!cart.destination)
      throw new Error("Carro de compra aun not tiene destino no tiene destino")

    const quotes = await cartService.listShippingQuotes(cart, cart.destination.comunaId, domainId);

    res.json(quotes)
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

app.get("/:domainId/checkout/pickup-date", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const facilityId = parseInt(req.query.facilityId);
    const wuid = req.query.wuid;

    const cart = await findCart(wuid, domainId)

    const pitIds = cart.items.map(i => i.product.productItemId);

    const stocks = await stockByStore(facilityId, pitIds, domainId );

    var avlDate = addBusinessDays(new Date(), 2);
    var nextDate = new Date()
    nextDate.setDate(avlDate.getDate() + 1);

    let description = "";

    if (avlDate.getMonth() === nextDate.getMonth()) {
      description = `${avlDate.getDate()} y ${nextDate.getDate()} de ${avlDate.toLocaleDateString('es-CL', { month: 'long' })}`;
    } else {
      description = `${avlDate.getDate()} de ${avlDate.toLocaleDateString('es-CL', { month: 'long' })} y ${nextDate.getDate()} de ${nextDate.toLocaleDateString('es-CL', { month: 'long' })}`;
    }


    res.json({
      "availableIn2Hours": false,
      "avlFromDate": nextDate,
      "avlToDate": avlDate,
      "description": description,
      "stocks": stocks
    })
  } catch (e) {
    next(e)
  }

})

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
    console.error("error: " + e.message)
    res.json({
      success: false,
      error: e.message,
      message: e.message,
    });

  }


})


const juice = require('juice');
const sgMail = require('@sendgrid/mail');
const parametersClient = require("../services/parametersClient");
const fs = require('fs').promises;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


async function orderConfirmationHtml(orderId, domainId) {

  const order = await drizzleDb.query.saleOrder.findFirst({
    where: (saleOrder, {eq}) =>
        and(
            eq(saleOrder.id, orderId),
            eq(saleOrder.domainId, domainId),
        ),
    with: {
      paymentMethod: true,
      shipmentMethod: true,
      items: true,
      customer: {
        columns: {
          id: true,
          name: true,
        }
      },
      destinationFacility: {
        columns: {
          id: true,
          name: true,
        }
      },
      shippingAddress: {
        with: {
          comuna: {
            id: true,
            name: true,
          }
        }
        // how can I also get comuna ej: with: comuna
      }
    },
  });
  const domainDb = await drizzleDb.query.domain.findFirst({
    where: (domain, {eq}) => eq(domain.id, domainId),
    with: {
      ownerParty: {
        columns: {
          id: true,
          name: true,
        }
      }
    },
  });

  const pitIds = order.items.filter(it => it.productItemId > 0).map(it2 => it2.productItemId);

  const productsService = container.resolve("productsService")
  const products = await productsService.findProductsByProductItems(pitIds, domainId);
  var imgHelper = new ProductImageHelper();
  for (var item of order.items) {
    if (!(item.productItemId > 0))
      continue;

    item.product = null

    var itemProduct = products.find(p => p.productItems.some(pit => pit.id === item.productItemId));
    if (itemProduct) {
      item.product = itemProduct;
      item.imageURL = imgHelper.getUrl(itemProduct.image, 300, domainId)

      item.productItem = itemProduct.productItems.find(pit => pit.id === item.productItemId)
      item.featureDescription = getFeaturesDescription(item.product, item.productItem);


    }
  }


  const logoParam = await parametersClient.getParameter("DOMAIN", "LOGO", domainId)
  let logo = logoParam ? logoParam.value : {};

  const emailData = {
    order: {
      number: order.id,
      paymentMethod: order.paymentMethod,
      date: order.orderDate,
      receivedBy: {
        name: order.customer ? order.customer.name : "",
      },
      shipmentMethod: order.shipmentMethod,
      items: order.items,
      shippedTo: order.shippingAddress ? {
        name: order.shippingAddress.name,
        rut: order.shippingAddress.rut,
        phone: order.shippingAddress.phone,
        email: order.shippingAddress.email,
        address: order.shippingAddress.address,
        comuna: {
          id: order.shippingAddress.comuna.id,
          name: order.shippingAddress.comuna.name,
          parent: {
            name: "Region Metropolitana"
          }
        }
      } : null,
      destination: {
        name: "Casa",
        phone: "123123",

        postalAddress: {
          address: "",
          comuna: {
            name: "",
          },
          latitude: "",
          longitude: "",
        }
      },

      paymentConfig: {
        bankAccounts: [],
      },
      shippingCost: {
        amount: 1000,
      },
      subtotal: 1000,
      total: 1000,
    },
    OrderItemType: OrderItemType,
    formatOrderDate: function (date) {
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
        'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      return `${day} ${month}. ${year} ${hours}:${minutes}`;
    },
    formatHelper: {
      toTitleCase: (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
      formatMoney: (amount) => `$${amount.toLocaleString()}`,
      encodeUrl: (str) => encodeURIComponent(str)
    },
    domainHelper: {
      getLogo: () => logo,
      getSiteRoot: () => 'https://www.motomundi.cl'
    },
    domain: {id: 1, name: "MotoMundi", party: {name: "MotoMundi SPA"}},
    isNeto: false,
    tiempoDespacho: '3-5 días hábiles',
    hash: "",
    gmapKey: process.env.GOOGLE_MAPS_KEY || '',
    webSite: {
      templateInstance: {
        getConfigValue: key => {
          if(key === "facebook-url"){
            return "https://www.facebook.com/motomundi.la"
          }
          if(key === "instagram-url"){
            return "https://www.instagram.com/motomundi"
          }
          if(key === "youtube-url"){
            return "https://www.youtube.com/motomunditv"
          }
          if(key === "tiktok-url"){
            return "https://www.tiktok.com/motomundicl"
          }
          return "";
        }
      }
    }
  };


  const templatePath = path.join(__dirname, '../templates/confirmation.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  const html = ejs.render(template, emailData);
  return  html;
}

app.get("/test-email", async (req, res, next) => {

  const domainId = 1
  const orderId = parseInt(req.query.orderId)
  const html = await orderConfirmationHtml(orderId, domainId);

  // Inline all CSS styles automatically
  // const inlinedHtml =  juice(html);

  const msg = {
    to: "jcfuentes@ailoo.cl",
    from: 'ventas@motomundi.cl',
    subject: `Pedido ${orderId} - Confirmación`,
    html: html
  };

//  const response = await sgMail.send(msg);
  res.send(html);
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

function addBusinessDays(date, days) {
  if (days < 0) {
    throw new Error("days cannot be negative");
  }

  if (days === 0) return new Date(date);

  // Create a copy to avoid mutating the original date
  let result = new Date(date);

  // Sunday = 0, Monday = 1, ..., Saturday = 6
  if (result.getDay() === 6) { // Saturday
    result.setDate(result.getDate() + 2);
    days -= 1;
  } else if (result.getDay() === 0) { // Sunday
    result.setDate(result.getDate() + 1);
    days -= 1;
  }

  result.setDate(result.getDate() + Math.floor(days / 5) * 7);
  const extraDays = days % 5;

  if (result.getDay() + extraDays > 5) {
    result.setDate(result.getDate() + extraDays + 2);
  } else {
    result.setDate(result.getDate() + extraDays);
  }

  return result;
}

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

