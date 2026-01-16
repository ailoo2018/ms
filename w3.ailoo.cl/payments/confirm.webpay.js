const transbankSdk = require( 'transbank-sdk' )
const {db: drizzleDb} = require("../db/drizzle");
const { WebpayPlus, Options, IntegrationApiKeys, IntegrationCommerceCodes, Environment } = transbankSdk
const { and, eq } = require("drizzle-orm");
const ordersService = require("../services/ordersService");
const logger = require("@ailoo/shared-libs/logger")
/**
 * {
 *   "vci": "TSY",
 *   "amount": 1000,
 *   "status": "AUTHORIZED",
 *   "buy_order": "oc-189816}",
 *   "session_id": "session-1768246568905",
 *   "card_detail": {
 *     "card_number": "6623"
 *   },
 *   "accounting_date": "0112",
 *   "transaction_date": "2026-01-12T19:36:24.874Z",
 *   "authorization_code": "1213",
 *   "payment_type_code": "VN",
 *   "response_code": 0,
 *   "installments_number": 0
 * }
 */

const TEST_COMMERCE_CODE='597055555532'

async function confirmWebPay(token, domainId) {


  logger.info("confirmWebPay: " + token + " domainId: " + domainId)

  const env = process.env.NODE_ENV === 'production' && process.env.WEBPAY_COMMERCE_CODE !== TEST_COMMERCE_CODE ? Environment.Production :  Environment.Integration
  const tx = new WebpayPlus.Transaction(new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      env,
  ))

  const response = await tx.commit(token)

  const success = response.response_code === 0
  if(!success){
    throw new Error(`Transaccion rechazada ${response.response_code}`)
  }

  const order = await drizzleDb.query.saleOrder.findFirst({
    where: (saleOrder, { eq }) =>
        and(
            eq(saleOrder.id, parseInt(response.buy_order)),
            eq(saleOrder.domainId, domainId),
        ),

    with: {
      items: true,
    },
  });

  if (!order) {
    return { success: false, message: `Orden de compra no encontrada` }
  }
  const orderTotal = ordersService.getTotal(order)
  if(response.amount !== orderTotal){
    return { success: false, message: `Montos no coinciden: ${paymentData.transaction_amount} vs ${orderTotal}` }
  }


  return {
    success: true,
    message: "Pago aprobado",
    orderId: order.id,
    authcode: response.authorization_code,
    gatewayResponse: response,
  }
}


module.exports = { confirmWebPay }