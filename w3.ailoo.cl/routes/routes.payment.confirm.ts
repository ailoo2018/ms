import {Router} from "express";
import logger from "@ailoo/shared-libs/logger";
import {and, eq, sql} from "drizzle-orm";
import { confirmPayment } from "../payments/confirm.payments.t.js";
import type {PaymentValidation} from "../clients/paymentValidator.js";
import schema, {SaleOrder} from "../db/schema.js";
import {adminClient} from "../clients/adminClient.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {OrderState, PaymentMethodType} from "../models/domain.js";

const {saleOrder, orderJournal, payment, paymentApplication} = schema

const router = Router(); // Create a router instead of using 'app'

async function paySaleOrder(confirmRs: PaymentValidation, domainId: number) {

    const order: any = await drizzleDb.query.saleOrder.findFirst({
        where: (saleOrder, {eq}) =>
            and(
                eq(saleOrder.id, parseInt(confirmRs.referenceId)),
                eq(saleOrder.domainId, domainId),
            ),

        with: {
            items: true,
        },
    });


    if (order.state !== OrderState.Ingresado && order.state !== OrderState.DerivadoSAC) {
        return
    }

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
            description: `Pago exitoso. Código de autorización: ${confirmRs.authorizationCode}`,
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

    const results = await drizzleDb
        .select({
            payment: payment,
        })
        .from(paymentApplication)
        .innerJoin(
            payment,
            eq(paymentApplication.paymentId, payment.id)
        )
        .where(eq(paymentApplication.invoiceId, invoiceId));

    const payments = results.map(r => r.payment);

    if(payments.some(p => p.paymentRefNum === String(confirmRs.authorizationCode))) {
        return
    }


    try {
        //     await sendOrderConfirmationEmail(confirmRs.orderId, domainId)
        logger.info("add payment adminClient: " + JSON.stringify({
            invoiceId: invoiceId,
            trxAmount: confirmRs.transactionAmount,
            currency: confirmRs.currency,
            authCode: confirmRs.authorizationCode,
            payMethodId: confirmRs.paymentMethodId,
            domainId: domainId
        }));
        await adminClient.addPayment(
            invoiceId,
            confirmRs.transactionAmount,
            confirmRs.authorizationCode,
            confirmRs.paymentMethodId,
            confirmRs.currency || "CLP",
            domainId);
    } catch (e) {
        logger.error("Error adding payment adminClient: " + e.message)
        console.error(e.message, e)
    }
}

router.post("/:domainId/checkout/payment-status", async (req, res, next) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const rq = req.body

        let authCode = ""
        let currency = "CLP"
        let amount = 0
        let rs : PaymentValidation = null;
        let referenceId = rq.referenceId
        let transactionDate: Date = null
        let paymentData = null
        if (rq.referenceType === "invoice") {
            const payApplications = await drizzleDb.query.paymentApplication.findMany({
                where: (paymentApplication, {eq}) => eq(paymentApplication.invoiceId, rq.referenceId),
                with: {
                    payment: true, // This includes the parent payment details
                },
            });

            var payApp = payApplications.find(pa => pa.payment.paymentMethodType === rq.paymentMethodId)
            if (payApp) {
                amount = payApp.payment.amount
                currency = payApp.payment.currency
                authCode = payApp.payment.paymentRefNum
                transactionDate = payApp.payment.effectiveDate
                paymentData = {date: payApp.payment.effectiveDate}
            }

            rs = {
                referenceType: rq.referenceType,
                referenceId: rq.referenceId,
                success: true,
                authorizationCode: authCode,
                currency: currency,
                transactionAmount: amount,
                responseData: paymentData,
                responseCode: "",
                paymentMethodId: rq.paymentMethodId,
                transactionDate: transactionDate,

            }

        }else{ // order
            const order : SaleOrder  = await drizzleDb.query.saleOrder.findFirst({
                where: (saleOrder, { eq }) =>
                    and(
                        eq(saleOrder.id, parseInt(referenceId || 0)),
                        eq(saleOrder.domainId, domainId),
                    ),

                with: {
                    items: true,
                },
            });

            rs = {
                referenceType: rq.referenceType,
                referenceId: rq.referenceId,
                success: false,
                authorizationCode: null,
                currency: currency,
                transactionAmount: amount,
                responseData: paymentData,
                responseCode: "",
                paymentMethodId: rq.paymentMethodId,
                transactionDate: transactionDate,

            }

            if(!order){
                rs.success = false
            }else{
                rs.authorizationCode = order.authCode
                rs.success = order.state == OrderState.Pagado

                if(!rq.success)
                    rs.message = "Orden está en estado " + order.state
            }
        }



        res.json(rs)
    } catch (e) {
        next(e)
    }
})

router.post("/:domainId/checkout/payment-result", async (req, res) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const rq = req.body

        const confirmRs: PaymentValidation = await confirmPayment(rq.authorizationCode, rq.paymentMethodId, domainId)

        if (confirmRs.referenceType === "invoice" && confirmRs.success) {
            logger.info("payInvoice")
            await payInvoice(confirmRs, domainId)
        } else if (confirmRs.success) {
            logger.info("paySaleOrder")
            await paySaleOrder(confirmRs, domainId)
        }


        if (!confirmRs.transactionDate) {
            confirmRs.transactionDate = new Date()
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