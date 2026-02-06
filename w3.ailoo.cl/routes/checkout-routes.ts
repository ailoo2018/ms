import { Router } from "express";
import { contactsClient } from "../services/contactsClient.js";
import schema from "../db/schema.js";
import { PbxRepository}  from "../el/pbx.js";
import {OrderItemType, OrderState, PaymentMethodType, SaleType, ShipmentMethodType} from "../models/domain.js";
import {and, eq, sql} from "drizzle-orm";
import logger from "@ailoo/shared-libs/logger";

import {db as drizzleDb} from "../db/drizzle.js";
import {CartItemType} from "../models/cart-models.js";
import {findCart} from "../services/cartService.js";
import {stockByStore} from "../db/inventory.js";
import container from "../container/index.js";
import {orderConfirmationHtml, sendOrderConfirmationEmail} from "../services/emailsService.js";

const router = Router(); // Create a router instead of using 'app'

const {
  user,
  contactMechanism,
      facility,
      orderJournal,
      party,
      postalAddress,
      saleOrder,
      saleOrderItem
} = schema


const cartService = container.resolve("cartService");


router.get("/:domainId/shipping/methods", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const wuid = req.query.wuid;


    const cart = await findCart(wuid, domainId)
    if (!cart.destination)
      throw new Error("Carro de compra aun not tiene destino no tiene destino")

    const quotes = await cartService.listShippingQuotes(cart, cart.destination.comunaId, domainId);

    res.json(quotes)
  } catch (e) {
    next(e)
  }

})

router.get("/:domainId/shipping/set-carrier", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const carrierId = parseInt(req.query.carrierId);
    const wuid = req.query.wuid;

    const cart = await findCart(wuid, domainId);

    cart.shipmentMethod = {id: carrierId};

    await cartService.update(cart)

    res.json(cart.shipmentMethod)
  } catch (e) {
    next(e)
  }

})

router.get("/:domainId/checkout/pickup-date", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const facilityId = parseInt(req.query.facilityId);
    const wuid = req.query.wuid;

    const cart = await findCart(wuid, domainId)


    const pitIds = []
    for(var i of cart.items){
      if(i.product)
        pitIds.push( i.product.productItemId )
      if(i.packId > 0){
        i.packContents.forEach((item)=>{
          if(item.product){
            pitIds.push(item.product.productItemId);
          }
        })
      }
    }


    const stocks = await stockByStore(facilityId, pitIds, domainId);

    var avlDate = addBusinessDays(new Date(), 2);
    var nextDate = new Date()
    nextDate.setDate(avlDate.getDate() + 1);

    let description = "";

    if (avlDate.getMonth() === nextDate.getMonth()) {
      description = `${avlDate.getDate()} y ${nextDate.getDate()} de ${avlDate.toLocaleDateString('es-CL', {month: 'long'})}`;
    } else {
      description = `${avlDate.getDate()} de ${avlDate.toLocaleDateString('es-CL', {month: 'long'})} y ${nextDate.getDate()} de ${nextDate.toLocaleDateString('es-CL', {month: 'long'})}`;
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

router.post("/:domainId/checkout/create-order", async (req, res, next) => {

  try {
    const rq = req.body

    logger.info("create-order rq: " + JSON.stringify(rq));
    const domainId = parseInt(req.params.domainId);


    const result = await drizzleDb.transaction(async (tx) => {

      try {
        let user = null
        let person = null;

        logger.log("drizzleDb.transaction 1")

        if (rq.userId > 0) {
          user = await drizzleDb.query.user.findFirst({
            where: eq(user.id, rq.userId),
            with: {
              person: true, // This joins the 'party' table
            },
          });
        }

        logger.log("drizzleDb.transaction 2")

        if (user != null && user.person != null)
          person = user.person;

        logger.log("drizzleDb.transaction 3")

        if (person == null)
          person = await getPartyPartial(rq.customerInformation.email, domainId);

        logger.log("drizzleDb.transaction 4")
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
        } else {
          // update phone
          await tx
              .update(party)
              .set({phone: rq.customerInformation.address.phone})
              .where(eq(party.id, person.id));
        }

        logger.log("drizzleDb.transaction 5")
        await PbxRepository.updateParty(rq.customerInformation.phone, person.id, person.name,
            person.email, domainId);

        logger.log("drizzleDb.transaction 6")
        let postalAddressId = null;
        const cart = await findCart(rq.wuid, domainId)
        if (cart.shipmentMethod.id === ShipmentMethodType.StorePickup) {
          const facilityDb = await drizzleDb.query.facility.findFirst({
            where: (productItem) => eq(facility.id, rq.pickupStore.id),
            with: {
              contacts: {
                with: {
                  contactMechanism: {
                    with: {
                      postalAddress: true
                    }
                  }
                }
              }
            }
          });

          var contactPostal = facilityDb.contacts.find(c => c.contactMechanism && c.contactMechanism.postalAddress);
          if (contactPostal) {
            var postalAddressDb = contactPostal.contactMechanism.postalAddress;
            postalAddressId = postalAddressDb.postalAddressId

          }


        } else {
          const [cmResult] = await tx.insert(contactMechanism).values({});
          postalAddressId = cmResult.insertId;


          await tx.insert(postalAddress).values({
            postalAddressId: postalAddressId, // Use the shared ID
            phone: rq.shipmentInformation.address.phone,
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

        }

        logger.log("drizzleDb.transaction 7")

        const [orderResult] = await tx.insert(saleOrder).values({
          orderDate: new Date(),
          expectedDeliveryDate: new Date(),
          shippedToId: postalAddressId, // Points to both tables via the shared ID
          state: 1,
          paymentMethodTypeId: rq.paymentMethod.gateway,
          shipmentMethodTypeId: cart.shipmentMethod ? cart.shipmentMethod.id : null,
          orderedBy: person.id,
          invoicedTo: null, // todo datos de factura
          domainId: domainId
        });

        const newOrderId = orderResult.insertId;
        //const pitMap = await getProductItemsMap(rq.items, domainId)

        let orderTotal = 0
        logger.log("drizzleDb.transaction 8")

        for (const item of cart.items) {


          if (item.type === CartItemType.Product) {

            validateRequestPrice(item, rq)

            const pitDb = await drizzleDb.query.productItem.findFirst({
              where: (productItem) => eq(productItem.id, item.product.productItemId)
            });

            item.product.id = pitDb.productId

            let itemToInsert = createProductSaleOrderItem(newOrderId, item, null, domainId)

            const [orderItemResult] = await tx.insert(saleOrderItem).values(itemToInsert);
            const orderItemId = orderItemResult.insertId;
            if (item.packContents && item.packContents.length > 0) {
              for (var packItem of item.packContents) {
                const packItemDb = createProductSaleOrderItem(newOrderId, packItem, orderItemId, domainId)
                await tx.insert(saleOrderItem).values(packItemDb);
              }
            }

            orderTotal += item.quantity * item.price
          } else if (item.type === CartItemType.Pack) {

            // validate price
            validateRequestPrice(item, rq)


            for (var packItem of item.packContents) {
              const packItemDb = createProductSaleOrderItem(newOrderId, packItem, null, domainId)
              await tx.insert(saleOrderItem).values(packItemDb);

              orderTotal += packItem.quantity * packItem.price
            }

            // add discount of pack a separate line
            if (item.packDiscount) {
              orderTotal += item.packDiscount.price
              await tx.insert(saleOrderItem).values({
                orderId: newOrderId,
                quantity: "1",
                unitPrice: item.packDiscount.price,
                unitCurrency: "CLP",
                type: OrderItemType.Discount,
                comment: item.packDiscount.name,
              });
            }

          }
        }

        logger.log("drizzleDb.transaction 9")

        return {id: orderResult.insertId, total: orderTotal,  addressId: postalAddressId};
      }catch(txerro){
        logger.error("CHECKOUT ERROR!!!!! " + txerro.message);
        logger.error("CHECKOUT ERROR!!!!! " + txerro.stack);

      }
    })

    logger.info("drizzleDb.transaction result: " + JSON.stringify(result))
    res.json({id: result.id, total: result.total, addressId: result.addressId})
  } catch (err) {
    logger.error("CHECKOUT ERROR!!!!! " + err.message);
    logger.error("CHECKOUT ERROR!!!!! " + err.stack);

    next(err);
  }
})

router.get("/:domainId/checkout/payment-methods", async (req, res, next) => {
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

router.get("/:domainId/checkout/click-collect", async (req, res, next) => {
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


function validateRequestPrice(item, rq) {
  const rqItem = rq.items.find(ri => ri.id === item.id)
  if (!rqItem)
    throw Error(`Producto no esperado en carro compra: ${item.name}`)

  if (rqItem.price !== rqItem.price) {
    throw Error(`Precio se modifico para item ${rqItem.name}`)
  }
}

function createProductSaleOrderItem(orderId, cartItem, orderItemId, domainId) {

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

export default router