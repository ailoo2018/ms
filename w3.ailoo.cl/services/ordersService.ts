import {ordersHelper} from "../helpers/order-helper.js";
import {db as drizzleDb} from "../db/drizzle.js";

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
            shippingAddress: true,
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