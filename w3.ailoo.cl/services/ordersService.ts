import {ordersHelper} from "../helpers/order-helper.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {
    listClientContactMechanisms,
    listClientContactMechanismsByInvoice,
    OrderContactMechanisms
} from "../db/ordersDb.js";
import {findLatestLeadByContact, getUserDetails} from "../models/kommo.types.js";
import sgMail from "../connections/sendmail.js";
import logger from "@ailoo/shared-libs/logger";

export const findOrder = async (orderId, domainId) => {
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


async function sendMailToSalesPerson(lead: any, salesPersonName, orderId: number, to: string) {
    const leadDate = new Date(lead.created_at * 1000).toLocaleDateString('es-CL', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const closedDate = new Date().toLocaleDateString('es-CL', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const leadUrl = `https://motomundi.kommo.com/leads/detail/${lead.id}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Venta Cerrada</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">🏍️ Motomundi</h1>
              <p style="margin:8px 0 0;color:#a0aec0;font-size:13px;">Sistema de Notificaciones de Ventas</p>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="background-color:#38a169;padding:16px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:bold;">✅ ¡Venta Cerrada Exitosamente!</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:#4a5568;font-size:15px;">Hola, <strong>${salesPersonName}</strong></p>
              <p style="margin:0 0 28px;color:#718096;font-size:14px;">
                Se ha registrado el cierre de una venta asociada a tu gestión. A continuación el resumen:
              </p>

              <!-- Info Cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:0 8px 16px 0;" width="50%">
                    <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
                      <p style="margin:0 0 4px;color:#a0aec0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Ticket</p>
                      <p style="margin:0;color:#2d3748;font-size:20px;font-weight:bold;">#${lead.id}</p>
                    </div>
                  </td>
                  <td style="padding:0 0 16px 8px;" width="50%">
                    <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
                      <p style="margin:0 0 4px;color:#a0aec0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Orden</p>
                      <p style="margin:0;color:#2d3748;font-size:20px;font-weight:bold;">#${orderId}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 8px 0 0;" width="50%">
                    <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
                      <p style="margin:0 0 4px;color:#a0aec0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Fecha del Lead</p>
                      <p style="margin:0;color:#2d3748;font-size:13px;font-weight:600;">${leadDate}</p>
                    </div>
                  </td>
                  <td style="padding:0 0 0 8px;" width="50%">
                    <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
                      <p style="margin:0 0 4px;color:#a0aec0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Fecha de Cierre</p>
                      <p style="margin:0;color:#2d3748;font-size:13px;font-weight:600;">${closedDate}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${leadUrl}"
                       style="display:inline-block;background-color:#2b6cb0;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:15px;font-weight:bold;">
                      Ver Ticket en Kommo →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#a0aec0;font-size:12px;text-align:center;">
                Si tienes preguntas, responde este correo o contacta a tu supervisor.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">
                © ${new Date().getFullYear()} Motomundi · Este es un correo automático, por favor no responder directamente.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const msg = {
        to,
        cc: "jcfuentes@motomundi.net",
        from: 'ventas@motomundi.cl',
        subject: `✅ Venta cerrada — Ticket #${lead.id} | Orden #${orderId}`,
        html,
    };

    await sgMail.send(msg);
}


export async function notifySalesPersonByInvoice(invoiceId: number, domainId: number) {
    try {
        const rs: OrderContactMechanisms = await listClientContactMechanismsByInvoice(invoiceId);

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
            await sendMailToSalesPerson(lead, salesPersonName, invoiceId, to);
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
            await sendMailToSalesPerson(lead, salesPersonName, orderId, to);
        }

        return { status: true, lead };
    } catch (e) {
        logger.error("Unable to notify salesperson: " + e.message);
        return { status: false};
    }
}