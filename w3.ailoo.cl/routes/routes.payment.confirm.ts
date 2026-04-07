import {Router} from "express";
import logger from "@ailoo/shared-libs/logger";
import {and, eq, sql} from "drizzle-orm";
import { confirmPayment } from "../payments/confirm.payments.t.js";
import type {PaymentValidation} from "../clients/paymentValidator.js";
import schema, {SaleOrder} from "../db/schema.js";
import {adminClient} from "../clients/adminClient.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {OrderState, PaymentMethodType} from "../models/domain.js";
import {ordersHelper} from "../helpers/order-helper.js";

const {saleOrder, orderJournal, payment, paymentApplication} = schema

const router = Router(); // Create a router instead of using 'app'

async function updateSaleOrderToPending(confirmRs: PaymentValidation, domainId: number) {
    await drizzleDb
        .update(saleOrder)
        .set({
            authCode: confirmRs.authorizationCode, // Ensure property name matches your req
            state: OrderState.PendientePago, // Ensure property name matches your req
        })
        .where(
            and(
                eq(saleOrder.id, parseInt(confirmRs.referenceId)),
                eq(saleOrder.domainId, domainId)
            )
        );
}
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

const processingLocks = new Map<string, Promise<void>>();

async function payInvoice(confirmRs: PaymentValidation, domainId: number) {
    const lockKey = String(confirmRs.authorizationCode);

    // If already processing this auth code, wait for it and return
    if (processingLocks.has(lockKey)) {
        await processingLocks.get(lockKey);
        return;
    }

    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
        resolveLock = resolve;
    });
    processingLocks.set(lockKey, lockPromise);

    try {
        await _doPayInvoice(confirmRs, domainId);
    } finally {
        processingLocks.delete(lockKey);
        resolveLock();
    }
}

async function _doPayInvoice(confirmRs: PaymentValidation, domainId: number) {
    const invoiceId = parseInt(confirmRs.referenceId);

    const results = await drizzleDb
        .select({ payment: payment })
        .from(paymentApplication)
        .innerJoin(payment, eq(paymentApplication.paymentId, payment.id))
        .where(eq(paymentApplication.invoiceId, invoiceId));

    if (results.some(r => r.payment.paymentRefNum === String(confirmRs.authorizationCode))) {
        logger.info(`Payment ${confirmRs.authorizationCode} already processed, skipping.`);
        return;
    }

    try {
        logger.info("add payment adminClient: " + JSON.stringify({
            invoiceId,
            trxAmount: confirmRs.transactionAmount,
            currency: confirmRs.currency,
            authCode: confirmRs.authorizationCode,
            payMethodId: confirmRs.paymentMethodId,
            domainId,
        }));

        await adminClient.addPayment(
            invoiceId,
            confirmRs.transactionAmount,
            confirmRs.authorizationCode,
            confirmRs.paymentMethodId,
            confirmRs.currency || "CLP",
            domainId
        );
    } catch (e) {
        // Unique constraint violation = already inserted by another process
        if (isUniqueConstraintError(e)) {
            logger.warn(`Duplicate payment skipped (DB constraint): ${confirmRs.authorizationCode}`);
            return;
        }
        logger.error("Error adding payment adminClient: " + e.message);
        console.error(e.message, e);
    }
}

function isUniqueConstraintError(e: any): boolean {
    // Postgres error code for unique violation
    return e?.code === '23505';
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

            rs = {
                referenceType: rq.referenceType,
                referenceId: rq.referenceId,
                paymentMethodId: rq.paymentMethodId,
                success: false,
                authorizationCode: null,
                currency: currency,
                transactionAmount: 0,
                responseCode: "",
                responseData: null
            }

            var payApp = payApplications.find(pa => pa.payment.paymentMethodType === rq.paymentMethodId)
            if (payApp) {
                rs.success = true
                rs.transactionAmount = payApp.payment.amount
                rs.currency = payApp.payment.currency
                rs.authorizationCode = payApp.payment.paymentRefNum
                rs.transactionDate = payApp.payment.effectiveDate
                rs.responseData = {date: payApp.payment.effectiveDate}
            }else{
                rs.success = false
                rs.message = "Pago no encontrado"
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

            amount = ordersHelper.getTotal(order)

            rs = {
                referenceType: rq.referenceType,
                referenceId: rq.referenceId,
                success: false,
                authorizationCode: order.authCode,
                currency: order.currency,
                transactionAmount: amount,
                responseData: paymentData,
                responseCode: "",
                paymentMethodId: rq.paymentMethodId,
                transactionDate: order.orderDate,

            }

            if(!order){
                rs.success = false
            }else{
                rs.authorizationCode = order.authCode
                rs.status = getStatus(order.state)
                rs.success = order.state == OrderState.Pagado || order.state == OrderState.PendientePago

                if(!rq.success)
                    rs.message = "Orden está en estado " + order.state
            }
        }



        res.json(rs)
    } catch (e) {
        next(e)
    }
})

function getStatus(state){
    if(state == OrderState.Pagado )
        return "PAID"
    if(state == OrderState.PendientePago)
        return "PENDING"
    return "UNKNOWN"
}

router.post("/:domainId/checkout/payment-result", async (req, res) => {

    try {
        const domainId = parseInt(req.params.domainId);
        const rq = req.body

        const confirmRs: PaymentValidation = await confirmPayment(rq.authorizationCode, rq.paymentMethodId, domainId)

        if (confirmRs.referenceType === "invoice" && confirmRs.success) {
            logger.info("payInvoice")
            await payInvoice(confirmRs, domainId)
        } else if (confirmRs.success) {

            if(confirmRs.status === "PENDING"){
                await updateSaleOrderToPending(confirmRs, domainId)
            }else{
                await paySaleOrder(confirmRs, domainId)
            }

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