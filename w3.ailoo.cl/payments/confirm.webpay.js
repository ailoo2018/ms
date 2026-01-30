const transbankSdk = require( 'transbank-sdk' )
const {db: drizzleDb} = require("../db/drizzle");
const { WebpayPlus, Options, IntegrationApiKeys, IntegrationCommerceCodes, Environment } = transbankSdk
const { and, eq } = require("drizzle-orm");
const ordersService = require("../services/ordersService");
const logger = require("@ailoo/shared-libs/logger")

const TEST_COMMERCE_CODE='597055555532'
const isProduction = process.env.NODE_ENV === 'production' && process.env.WEBPAY_COMMERCE_CODE !== TEST_COMMERCE_CODE;

async function confirmWebPay(token, domainId) {

  console.log("confirmWebPay: " + token + " domainId: " + domainId + " env: " + process.env.NODE_ENV + " commerce: " + process.env.WEBPAY_COMMERCE_CODE)
  logger.info("confirmWebPay: " + token + " domainId: " + domainId)


  const env = isProduction ? Environment.Production : Environment.Integration;
  const commerceCode = isProduction ? process.env.WEBPAY_COMMERCE_CODE : IntegrationCommerceCodes.WEBPAY_PLUS;
  const apiKey = isProduction ? process.env.WEBPAY_API_KEY : IntegrationApiKeys.WEBPAY;

  console.log(`Using Env: ${env} with Commerce Code: ${commerceCode}`);
  console.log(`env: ${env}`)

  const tx = new WebpayPlus.Transaction(new Options(
      commerceCode,
      apiKey,
      env
  ));

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
    amount: response.amount,
    orderId: order.id,
    authcode: response.authorization_code,
    gatewayResponse: response,
  }
}


module.exports = { confirmWebPay }