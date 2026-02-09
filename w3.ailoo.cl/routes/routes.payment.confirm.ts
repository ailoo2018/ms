import crypto from 'node:crypto';
import axios from 'axios';
import {Router} from "express";
import logger from "@ailoo/shared-libs/logger";
import {and, eq, sql} from "drizzle-orm";
import {
    confirmPayment,

} from "../payments/confirm.payments.t.js";
import type {PaymentValidation} from "../clients/paymentValidator.js";
import schema from "../db/schema.js";
import {sendOrderConfirmationEmail} from "../services/emailsService.js";
import {adminClient} from "../clients/adminClient.js";
import {db as drizzleDb} from "../db/drizzle.js";
import { OrderState } from "../models/domain.js";
import {validateJWT} from "../server.js";

const { saleOrder, orderJournal} = schema

const router = Router(); // Create a router instead of using 'app'

async function paySaleOrder(confirmRs: PaymentValidation, domainId: number) {
    await drizzleDb.transaction(async (tx) => {
        await tx
            .update(saleOrder)
            .set({
                authCode: confirmRs.authorizationCode, // Ensure property name matches your req
                state: OrderState.Pagado, // Ensure property name matches your req
            })
            .where(
                and(
                    eq(saleOrder.id, parseInt(confirmRs.referenceId)),
                    eq(saleOrder.domainId, domainId)
                )
            );

        await tx.insert(orderJournal).values({
            orderId: parseInt(confirmRs.referenceId),
            description: `Order paid successfully. AuthCode: ${confirmRs.authorizationCode}`,
            state: OrderState.Pagado,
            creationDate: new Date(),
            userId: sql`NULL`,
        });
    })

    try {
        await adminClient.paymentValidated(confirmRs.referenceId, confirmRs.authorizationCode, domainId)
    } catch (e) {
        logger.error("Unable to notify payment validated to admin: " + e.message)
    }

}

async function payInvoice(confirmRs: PaymentValidation, domainId: number) {
    const invoiceId = parseInt(confirmRs.referenceId);


    try {
        //     await sendOrderConfirmationEmail(confirmRs.orderId, domainId)
        await adminClient.addPayment(
            invoiceId,
            confirmRs.transactionAmount,
            confirmRs.authorizationCode,
            confirmRs.paymentMethodId,
            domainId) ;
    } catch (e) {
        console.error(e.message, e)
    }
}



router.post("/:domainId/checkout/payment-result", async (req, res) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const rq = req.body

        const confirmRs: PaymentValidation = await confirmPayment(rq.authorizationCode, rq.paymentMethodId, domainId)

        if(confirmRs.referenceType === "invoice" && confirmRs.success) {
            await payInvoice(confirmRs, domainId)
        }else if(confirmRs.success) {
            await paySaleOrder(confirmRs, domainId)
        }



        res.json(confirmRs);

    } catch (e) {
        console.error("error: " + e.message)
        res.json({
            success: false,
            error: e.message,
            message: e.message,
        });

    }


})


router.post("/currency", async (req, res, next) => {
    try {
        const dlocalApiKey = process.env.DLOCAL_GO_API_KEY;    // Tu X-Login
        const dlocalSecretKey = process.env.DLOCAL_GO_SECRET_KEY; // Tu Secret para firmar

        // ¡IMPORTANTE! dLocal solo permite USD como base para este endpoint
        const from = "USD";
        const to = "CLP";
        const xDate = new Date().toISOString();

        // Verifica si estás en Sandbox o Producción según tus llaves
        const baseUrl = "https://api.dlocal.com"; // Cambiar a https://api.dlocal.com en producción
        const path = "/currency-exchanges";
        const url = `${baseUrl}${path}?from=${from}&to=${to}`;

        // Generar Firma: X-Login + X-Date + RequestBody (vacío en GET)
        const dataToSign = dlocalApiKey + xDate + "";
        const signature = crypto
            .createHmac('sha256', dlocalSecretKey)
            .update(dataToSign)
            .digest('hex');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Date': xDate,
                'X-Login': dlocalApiKey,
                'X-Trans-Key': dlocalApiKey, // Prueba usando tu API Key aquí también
                'X-Version': '2.1',
                'Content-Type': 'application/json',
                'Authorization': `V2-HMAC-SHA256, Signature: ${signature}`
            }
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        next(error);
    }
});



// Replace with your real key from exchangerate-api.com


interface ExchangeRateResponse {
    result: string;
    base_code: string;
    conversion_rates: Record<string, number>;
    time_last_update_utc: string;
}

router.get('/api/convert',  async (req: Request, res: Response): Promise<any> => {
    // @ts-ignore
    const { from, to, amount } = req.query;

    const API_KEY = process.env.EXCHANGE_RATE_API_KEY;

    if (!from || !to || !amount) {
        // @ts-ignore
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        // 1. This API provides all rates for the base currency in one call
        const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${from}`;
        const response = await axios.get<ExchangeRateResponse>(url);

        const rates = response.data.conversion_rates;
        const target = String(to).toUpperCase();

        // 2. Filter the returned data for your destination currency
        if (!rates[target]) {
            // @ts-ignore
            return res. status(404).json({ error: `Currency '${target}' not supported.` });
        }

        const convertedAmount = Number(amount) * rates[target];

        // @ts-ignore
        return res.json({
            from: from,
            to: target,
            amount: Number(amount),
            convertedAmount: Number(convertedAmount.toFixed(2)),
            rate: rates[target],
            last_update: response.data.time_last_update_utc
        });

    } catch (error: any) {
        // @ts-ignore
        return res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
});

export default router