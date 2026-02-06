import {Router} from "express";
import logger from "@ailoo/shared-libs/logger";
import {and, eq, sql} from "drizzle-orm";
import {
    addPaymentToInvoice,
    confirmPayment,
    ValidationType
} from "../payments/confirm.payments.t.js";
import type {PaymentValidation} from "../clients/paymentValidator.js";
import schema from "../db/schema.js";
import {sendOrderConfirmationEmail} from "../services/emailsService.js";
import {adminClient} from "../services/adminClient.js";
import {db as drizzleDb} from "../db/drizzle.js";
import { OrderState } from "../models/domain.js";

const { saleOrder, orderJournal} = schema

const router = Router(); // Create a router instead of using 'app'

router.post("/:domainId/checkout/payment-result-invoice", async (req, res) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const rq = req.body

        const confirmRs: PaymentValidation = await confirmPayment(rq.authorizationCode, rq.paymentMethodId, ValidationType.Invoice, domainId)

        if (confirmRs.success) {
            await addPaymentToInvoice(
                parseInt(confirmRs.referenceId),
                confirmRs.transactionAmount,
                rq.paymentMethodId,
                confirmRs.authorizationCode,
                domainId
                )
        }

        try {
            //     await sendOrderConfirmationEmail(confirmRs.orderId, domainId)
        } catch (e) {
            console.error(e.message, e)
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

router.post("/:domainId/checkout/payment-result", async (req, res) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const rq = req.body


        const confirmRs: PaymentValidation = await confirmPayment(rq.authorizationCode, rq.paymentMethodId, ValidationType.Order, domainId)


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

        try {
            await sendOrderConfirmationEmail(confirmRs.referenceId, domainId)
        } catch (e) {
            console.error(e.message, e)
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

export default router