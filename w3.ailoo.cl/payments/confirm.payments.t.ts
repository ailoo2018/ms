import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq} from "drizzle-orm";
import { ordersHelper} from "../helpers/order-helper.js";
import { invoiceHelper}  from "../helpers/invoice-helper.js";
import {PaymentMethodType} from "../models/domain.js";
import type {PaymentValidation, PaymentValidator} from "../clients/paymentValidator";
import container from "../container/index.ts";

export const ValidationType = {
    Invoice: 0,
    Order: 1,
} as const;

export async function validateInvoice(referenceId: string, transactionAmount: number, domainId : number) {
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
        return { success: false, message: `Invoice no encontrada` }
    }
    const invoiceTotal = invoiceHelper.getTotal(invoice)
    if(transactionAmount !== invoiceTotal){
        throw new Error(`Montos no coinciden: ${transactionAmount} vs ${invoiceTotal}`)
    }

    // add payment to inovice then index
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
        throw new Error( `Montos no coinciden: ${transactionAmount} vs ${orderTotal}` )
    }

}


type PaymentMethodValues = typeof PaymentMethodType[keyof typeof PaymentMethodType];

// 2. Define the map with Record
const validatorMap: Record<PaymentMethodValues, string> = {
    [PaymentMethodType.Webpay]: "webPayValidator",
    [PaymentMethodType.MercadoPago]: "mercadoPagoValidator",
};

export async function confirmPayment(authId: string, paymentMethodType: number, validationType: number, domainId: number) {

    const validator = validatorMap[paymentMethodType as keyof typeof validatorMap];

    if (!validator) {
        throw new Error(`Tipo de pago no soportado: ${paymentMethodType}`);
    }
    const paymentValidator : PaymentValidator = container.resolve(validator)
    const response : PaymentValidation = await paymentValidator.validate(authId, paymentMethodType, domainId);


    if(!response.success){
        throw new Error(`Transaccion rechazada ${response.responseCode}`)
    }

    if(validationType === ValidationType.Invoice) {
        await validateInvoice(response.referenceId, response.transactionAmount, domainId)
    }else{
        await validateOrder(response.referenceId, response.transactionAmount, domainId)
    }

    return response

}



