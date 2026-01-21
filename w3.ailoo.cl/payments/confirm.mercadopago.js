const ordersService = require("../services/ordersService");
const { MercadoPagoConfig, Payment } = require( 'mercadopago' )
const {db: drizzleDb} = require("../db/drizzle");
const { and, eq } = require("drizzle-orm");

async function confirmMercadoPagoPayment(paymentId, domainId) {

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  })

  const payment = new Payment(client)
  const paymentData = await payment.get({ id: paymentId })


  if(paymentData.status !== 'approved'){
    return { success: false, message: `Pago no fue aprobado: ${paymentData.status}`}
  }


  const order = await drizzleDb.query.saleOrder.findFirst({
    where: (saleOrder, { eq }) =>
        and(
            eq(saleOrder.id, parseInt(paymentData.external_reference)),
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
  if(paymentData.transaction_amount !== orderTotal){
    return { success: false, message: `Montos no coinciden: ${paymentData.transaction_amount} vs ${orderTotal}` }
  }

  return {
    success: true,
    message: "Pago aprobado",
    amount: paymentData.transaction_amount,
    orderId: paymentData.external_reference,
    authcode: paymentId,
    gatewayResponse: paymentData,
    orderTotal,
  }
}

module.exports = { confirmMercadoPagoPayment}