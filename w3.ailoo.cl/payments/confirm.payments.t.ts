import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq} from "drizzle-orm";
import { ordersHelper} from "../helpers/order-helper.js";
import { invoiceHelper}  from "../helpers/invoice-helper.js";
import {PaymentMethodType} from "../models/domain.js";
import type {PaymentValidation, PaymentValidator} from "../clients/paymentValidator.js";
import container from "../container/index.js";
import schema from "../db/schema.js"
import {adminClient} from "../clients/adminClient.js";
import logger from "@ailoo/shared-libs/logger";

const { invoice, payment, paymentApplication } = schema;


export async function validateInvoice(referenceId: string, transactionAmount: number, paymentMethodType: number, domainId : number) {
    const invoice = await drizzleDb.query.invoice.findFirst({
        where: (invoice, { eq }) =>
            and(
                eq(invoice.id, parseInt(referenceId)),
                eq(invoice.domainId, domainId),
            ),

        with: {
            items: true,
        },
    });

    if (!invoice) {
        logger.error("Invoice no encontrada: " + referenceId);
        return { success: false, message: `Invoice no encontrada` }
    }
    const invoiceTotal = invoiceHelper.getTotal(invoice)
    if(transactionAmount !== invoiceTotal){
   //     throw new Error(`Montos no coinciden: ${transactionAmount} vs ${invoiceTotal}`)
    }


    try{

    }catch(e){
        console.error("Error adding payment")
        console.error(e)
    }
}

export async function validateOrder(referenceId: string, transactionAmount: number, domainId : number) {
    const order :any  = await drizzleDb.query.saleOrder.findFirst({
        where: (saleOrder, { eq }) =>
            and(
                eq(saleOrder.id, parseInt(referenceId)),
                eq(saleOrder.domainId, domainId),
            ),

        with: {
            items: true,
        },
    });

    if (!order) {
        throw new Error( `Orden de compra ${referenceId} no encontrada` )
    }
    const orderTotal = ordersHelper.getTotal(order)
    if(transactionAmount !== orderTotal){
        throw new Error( `Montos de orden de compra no coinciden: ${transactionAmount} vs ${orderTotal}` )
    }

}

type PaymentMethodValues = typeof PaymentMethodType[keyof typeof PaymentMethodType];

// 2. Define the map with Record
const validatorMap: Record<PaymentMethodValues, string> = {
    [PaymentMethodType.Webpay]: "webPayValidator",
    [PaymentMethodType.MercadoPago]: "mercadoPagoValidator",
    [PaymentMethodType.DLocal]: "dlocalValidator",
};

export async function confirmPayment(authId: string, paymentMethodType: number,  domainId: number) {

    const validator = validatorMap[paymentMethodType as keyof typeof validatorMap];

    if (!validator) {
        throw new Error(`Tipo de pago no soportado: ${paymentMethodType}`);
    }
    const paymentValidator : PaymentValidator = container.resolve(validator)
    const response : PaymentValidation = await paymentValidator.validate(authId, paymentMethodType, domainId);


    if(!response.success){
        throw new Error(`Transaccion rechazada ${response.responseCode}`)
    }

    if(response.referenceType === "invoice") {
        await validateInvoice(response.referenceId, response.transactionAmount, paymentMethodType, domainId)
    }else{
        await validateOrder(response.referenceId, response.transactionAmount, domainId)
    }

    return response

}

export async function addPaymentToInvoice(invoiceId: number, amount: number, paymentMethodId: number, authorizationCode: string, domainId: number){
    const invRs = await drizzleDb.select({
        receivedById: invoice.receivedById,
        emittedById: invoice.emittedById
    }).from(invoice).where(
        and(
            eq(invoice.id, invoiceId),
            eq(invoice.domainId, domainId)
        )
    )

    const inv = invRs[0];

    const [result] = await drizzleDb.insert(payment).values({
        amount: amount,
        paymentMethodType: paymentMethodId,
        effectiveDate: new Date(),
        paymentRefNum: authorizationCode,
        domainId: domainId,
        receivedById: inv.emittedById,
        emittedById: inv.receivedById,
        currency: "CLP",
        createDate: new Date(),
        tenderAmount: amount,
    })

    let paymentId: number = result.insertId

    const [paRs] = await drizzleDb.insert(paymentApplication).values({
        amountApplied: amount,
        paymentId: paymentId,
        invoiceId: invoiceId,
        originalCurrency: "CLP",
        originalAmount: amount,
        conversionFactor: 1,
    })

    try{
        await adminClient.indexDocument(invoiceId, domainId)
    }catch(e){
        console.error(e.message, e)
    }

}

export function getReferenceId(refId) : number {
    if(refId.startsWith("invoice-")){
        refId = refId.replace("invoice-","")
    }

    if(refId.startsWith("order-")){
        refId = refId.replace("order-","")
    }

    const firstNumber: string = refId.split('-')[0];
    return parseInt(firstNumber, 10);
}


export function getReferenceType(refId) : string {
    if(refId.startsWith("invoice-")){
        return "invoice"
    }

    return "order"
}
