import type {PaymentValidation, PaymentValidator} from "./paymentValidator.js";
import logger from "@ailoo/shared-libs/logger";
import crypto from "crypto";
import {getReferenceId, getReferenceType} from "../payments/confirm.payments.t.js";




export class DlocalValidator implements PaymentValidator {
    async validate(token: string, paymentMethodType: number, domainId: number): Promise<PaymentValidation> {
        const logMsg = `confirm dlocal: ${token} | domainId: ${domainId} | env: ${process.env.NODE_ENV}`;
        console.log(logMsg);
        logger.info(logMsg);


        const paymentData : any = fetchPaymentDetails(token)

        logger.info("paymentData: " + JSON.stringify(paymentData)); 

        return Promise.resolve({
            referenceId: "" + getReferenceId(paymentData.external_reference),
            referenceType: getReferenceType(paymentData.external_reference),
            transactionAmount: paymentData.amount,
            paymentMethodId: paymentMethodType,
            responseData: paymentData,
            authorizationCode: token,
            success: true,

        });
    }
}


/** RETURNS
 *
 *     {
 *   "success": true,
 *   "status": "PAID",
 *   "data": {
 *     "id": "DP-5552183",
 *     "amount": 900,
 *     "balance_amount": 1.01,
 *     "balance_fee": 0.04,
 *     "currency": "CLP",
 *     "balance_currency": "USD",
 *     "payment_method_type": "CREDIT_CARD",
 *     "country": "CL",
 *     "created_date": "2026-02-07T22:31:36",
 *     "approved_date": "2026-02-07T22:32:11",
 *     "status": "PAID",
 *     "order_id": "27784141-1770503495066",
 *     "notification_url": "https://encourage-pending-david-town.trycloudflare.com/api/webhooks/dlocal",
 *     "success_url": "https://encourage-pending-david-town.trycloudflare.com/payments/dlocal/invoice",
 *     "back_url": "https://encourage-pending-david-town.trycloudflare.com/payments/dlocal/invoice",
 *     "redirect_url": "https://checkout.dlocalgo.com/validate/VBiCALRUZyjDkEpv1cvm5T4foj6K11P3",
 *     "merchant_checkout_token": "VBiCALRUZyjDkEpv1cvm5T4foj6K11P3",
 *     "direct": true,
 *     "payer": {
 *       "first_name": "Juan",
 *       "last_name": "Fuentes",
 *       "email": "jcfuentes@ailoo.cl",
 *       "document_type": "RUT",
 *       "document": "153203008"
 *     },
 *     "card": {
 *       "bin": "454851",
 *       "issuer": "BANCO DE CREDITO E INVERSIONES",
 *       "last_four": "1440"
 *     }
 *   }
 * }
 * @param paymentId
 */

async function fetchPaymentDetails(paymentId: string) {

    const dlocalApiKey = process.env.DLOCAL_GO_API_KEY
    const dlocalSecretKey = process.env.DLOCAL_GO_SECRET_KEY
    const dlocalApiUrl = process.env.DLOCAL_GO_BASE_URL

    // 1. Prepare Variables
    const xLogin = dlocalApiKey      // Your X-Login / API Key
    const xTransKey = dlocalSecretKey // Your X-Trans-Key
    const secretKey = dlocalSecretKey // Your Secret Key (often same as trans-key in GO)
    const xDate = new Date().toISOString()
    const url = `${dlocalApiUrl}/v1/payments/${paymentId}`

    // 2. Generate Signature
    // Formula: X-Login + X-Date + RequestBody (Empty string for GET)
    const dataToSign = xLogin + xDate + ""
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(dataToSign)
        .digest('hex')

    const data: any = await fetch(url, {
        method: 'GET',
        headers: {
            'X-Date': xDate,
            'X-Login': xLogin,
            'X-Trans-Key': xTransKey,
            'X-Version': '2.1',
            'User-Agent': 'Nuxt-App',
            'Content-Type': 'application/json',
            // The Authorization header must be formatted exactly like this:
            'Authorization': `Bearer ${dlocalApiKey}:${dlocalSecretKey}`,
        }
    })


    return await data.json()


}
