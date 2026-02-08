import type {PaymentValidation, PaymentValidator} from "./paymentValidator.js";
import logger from "@ailoo/shared-libs/logger";
import {MercadoPagoConfig, Payment} from "mercadopago";
import {getReferenceId, getReferenceType} from "../payments/confirm.payments.t.js";




export class MercadoPagoValidator implements PaymentValidator {
    async validate(token: string, paymentMethodType: number, domainId: number): Promise<PaymentValidation> {
        const logMsg = `confirmWebPay: ${token} | domainId: ${domainId} | env: ${process.env.NODE_ENV}`;
        console.log(logMsg);
        logger.info(logMsg);


        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
        })

        const payment = new Payment(client)
        const paymentData = await payment.get({ id: token })


        return Promise.resolve({
            referenceId: "" + getReferenceId( paymentData.external_reference ),
            referenceType: getReferenceType(paymentData.external_reference),
            transactionAmount: paymentData.transaction_amount,
            paymentMethodId: paymentMethodType,
            responseData: paymentData,
            authorizationCode: token,
            success: true,

        });
    }
}