import type {PaymentValidation, PaymentValidator} from "./paymentValidator.js";

import transbankSdk from "transbank-sdk";
import {getReferenceId, getReferenceType} from "../payments/confirm.payments.t.js";

const { WebpayPlus, Options, IntegrationApiKeys, IntegrationCommerceCodes, Environment } = transbankSdk

const TEST_COMMERCE_CODE : string ='597055555532'
const isProduction : boolean = process.env.NODE_ENV === 'production' && process.env.WEBPAY_COMMERCE_CODE !== TEST_COMMERCE_CODE;




export class WebPayValidator implements PaymentValidator {
    async validate(token: string, paymentMethodType: number, domainId: number): Promise<PaymentValidation> {
        const logMsg = `confirmWebPay: ${token} | domainId: ${domainId} | env: ${process.env.NODE_ENV}`;
        console.log(logMsg);


        const env : any = isProduction ? Environment.Production : Environment.Integration;
        const commerceCode : string = isProduction ? process.env.WEBPAY_COMMERCE_CODE : IntegrationCommerceCodes.WEBPAY_PLUS;
        const apiKey : string = isProduction ? process.env.WEBPAY_API_KEY : IntegrationApiKeys.WEBPAY;

        console.log(`Using Env: ${env} with Commerce Code: ${commerceCode}`);
        console.log(`env: ${env}`)

        const tx = new WebpayPlus.Transaction(new Options(
            commerceCode,
            apiKey,
            env
        ));

        const response = await tx.commit(token)

        return Promise.resolve({
            referenceId: "" + getReferenceId(response.buy_order),
            referenceType: getReferenceType(response.buy_order),
            transactionAmount: response.amount,
            paymentMethodId: paymentMethodType,
            responseData: response,
            authorizationCode: response.authorization_code,
            success: response.response_code === 0,

        });
    }
}
