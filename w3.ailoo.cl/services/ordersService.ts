import {ordersHelper} from "../helpers/order-helper.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {
    insertInvoiceLead,
    listClientContactMechanisms,
    listClientContactMechanismsByInvoice,
    OrderContactMechanisms
} from "../db/ordersDb.js";
import {findLatestLeadByContact, getUserDetails} from "../models/kommo.types.js";
import sgMail from "../connections/sendmail.js";
import logger from "@ailoo/shared-libs/logger";
import {fileURLToPath} from "url";
import path from "path";
import {promises as fs} from "fs";
import ejs from "ejs";
import {getDocumentsIndexName, getElClient, getIndexName} from "../connections/el.js";

export const findOrder = async (orderId, domainId, ) => {
    const orderDb = await drizzleDb.query.saleOrder.findFirst({
        where: (saleOrder, {and, eq}) => {
            return and(
                eq(saleOrder.id, orderId),
                eq(saleOrder.domainId, domainId),
            )
        },
        with: {
            items: true,
            customer: true,
            paymentMethod: true,
            shippingAddress: {
                with: {
                    comuna: true,
                },
            },
            shipmentMethod: true,
            journals: true,
        }
    })

    const order = {...orderDb, eta: new Date() } as any

    const pitMap = await ordersHelper.getProductItems(order, domainId);
    let shipping = 0
    for(var oi of order.items){
        if(oi.productItemId > 0 && pitMap.has(oi.productItemId)){
            oi.productItem = pitMap.get(oi.productItemId)
        }else if(oi.type === 2){
            shipping += oi.unitPrice
        }
    }

    order.total = ordersHelper.getTotal(order)
    order.netTotal = Math.round(order.total / 1.19)
    order.iva = order.total - order.netTotal
    order.shipping = shipping;

    return order
}


async function sendMailToSalesPerson(lead: any, salesPersonName, orderId: any, to: string, type: string, invoiceType?: any, invoiceId?: number) {
    const leadDate = new Date(lead.created_at * 1000).toLocaleDateString('es-CL', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const closedDate = new Date().toLocaleDateString('es-CL', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const leadUrl = `https://motomundi.kommo.com/leads/detail/${lead.id}`;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join( __dirname, "..", 'templates', 'lead.ejs');
    const template = await fs.readFile(templatePath, 'utf-8');

    const html = ejs.render(template, {
        salesPersonName,
        lead,
        orderId,
        leadDate,
        closedDate,
        leadUrl,
        type,
        invoiceType,
        invoiceId: invoiceId || 0,
    })

    const msg = {
        to,
        cc: "jcfuentes@motomundi.net",
        from: 'ventas@motomundi.cl',
        subject: type === "INVOICE" ? `✅ Venta cerrada — Ticket #${lead.id} | ${invoiceType} #${orderId}` : `✅ Venta cerrada — Ticket #${lead.id} | Orden #${orderId}`,
        html,
    };

    await sgMail.send(msg);
}


export async function notifySalesPersonByInvoice(invoiceId: number, domainId: number) {
    try {

        const invoice = await drizzleDb.query.invoice.findFirst({
            where: (invoice, {and, eq}) => {
                return eq(invoice.id, invoiceId)
            }
        })

        const rs: OrderContactMechanisms = await listClientContactMechanismsByInvoice(invoiceId);

        let lead = null;
        if (rs?.phones?.length > 0) {

            const email = rs?.emails?.[0] || null;
            const phone = rs?.phones?.[0] || null;

            const lead = await findLatestLeadByContact({email, phone});

            if (!lead) {
                return {status: false};
            }

            let kommoUser = null

            if(lead.responsible_user_id > 0)
                kommoUser = await getUserDetails(lead.responsible_user_id);

            let to = "jcfuentes@motomundi.cl";

            let ailooUser = null;
            if(kommoUser) {
                ailooUser = await drizzleDb.query.user.findFirst({
                    where: (user, {eq, and}) =>
                        and(eq(user.email, kommoUser.email), eq(user.domainId, domainId))
                });
            }

            if (ailooUser && ailooUser?.email?.length > 0) {
                to = ailooUser.email;
            }

            const salesPersonName = ailooUser?.username ?? kommoUser?.name ?? "Vendedor";
            await sendMailToSalesPerson(lead, salesPersonName, invoice.number,
                to, "INVOICE", invoice.type === 0 ? "Boleta" : "Factura", invoiceId);

            await insertInvoiceLead(invoiceId, lead.id, ailooUser ? ailooUser.id: 0)

            // index lead
            const result = await getElClient().updateByQuery({
                index: getDocumentsIndexName(domainId),
                body: {
                    query: {
                        term: { id: invoiceId }
                    },
                    script: {
                        source: 'ctx._source.lead = params.lead',
                        lang: 'painless',
                        params: {
                            lead: {
                                id: lead.id,
                                userId: ailooUser ? ailooUser.id : 0,
                                username: ailooUser?.username || '',
                                status: 0,
                            }
                        }
                    }
                }
            });
        }

        return { status: true, lead };
    } catch (e) {
        logger.error("Unable to notify salesperson: " + e.message);
        return { status: false};
    }
}

export async function notifySalesPerson(orderId: number, domainId: number) {
    try {
        const rs: OrderContactMechanisms = await listClientContactMechanisms(orderId);

        let lead = null;
        if (rs?.phones?.length > 0) {

            const email = rs?.emails?.[0] || null;
            const phone = rs?.phones?.[0] || null;

            const lead = await findLatestLeadByContact({email, phone});

            if (!lead) return { status: false };

            let kommoUser = null

            if(lead.responsible_user_id > 0)
                kommoUser = await getUserDetails(lead.responsible_user_id);

            let to = "jcfuentes@motomundi.cl";

            let ailooUser = null;
            if(kommoUser) {
                ailooUser = await drizzleDb.query.user.findFirst({
                    where: (user, {eq, and}) =>
                        and(eq(user.email, kommoUser.email), eq(user.domainId, domainId))
                });
            }

            if (ailooUser && ailooUser?.email?.length > 0) {
                to = ailooUser.email;
            }

            const salesPersonName = ailooUser?.username ?? kommoUser?.name ?? "Vendedor";
            await sendMailToSalesPerson(lead, salesPersonName, orderId, to, "SALE_ORDER");
        }

        return { status: true, lead };
    } catch (e) {
        logger.error("Unable to notify salesperson: " + e.message);
        return { status: false};
    }
}