import type {PaymentValidation, PaymentValidator} from "./paymentValidator.js";
import { getReferenceType} from "../payments/confirm.payments.t.js";
import {PaypalCaptureResponse} from "./types/paypal.t.js";




export class PaypalValidator implements PaymentValidator {
    async validate(token: string, paymentMethodType: number, domainId: number): Promise<PaymentValidation> {



        const paypalApiUrl = process.env.PAYPAL_API_URL
        const paypalClientId = process.env.PAYPAL_CLIENT_ID
        const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET


        // 1. Get Access Token (Same logic as your previous function)
        // Tip: In a production app, consider caching this token for its duration
        const rs : any = await fetch(
            `${paypalApiUrl}/v1/oauth2/token`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            }
        )

        const authRes = await rs.json();

        const capture = await fetch(
            `${paypalApiUrl}/v2/checkout/orders/${token}/capture`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authRes.access_token}`,
                    'Content-Type': 'application/json',
                }
            }
        )

        const paymentData = await capture.json() as PaypalCaptureResponse

        if(paymentData.error?.length > 0)
            throw new Error("ERROR paypal: " + paymentData.error_description)
        // 3. Verify status is 'COMPLETED'
        const isApproved = paymentData.status === 'COMPLETED'

        const referenceId = paymentData.purchase_units[0].reference_id
        const totalPaid = Number(paymentData.purchase_units[0].payments.captures[0].amount.value);
        const currency = paymentData.purchase_units[0].payments.captures[0].amount.currency_code;


        return Promise.resolve({
            referenceId: "" + referenceId,
            referenceType: getReferenceType(referenceId),
            transactionAmount: totalPaid,
            currency: currency,
            transactionDate: new Date(),
            paymentMethodId: paymentMethodType,
            responseData: paymentData,
            authorizationCode: token,
            success: isApproved,

        });
    }
}