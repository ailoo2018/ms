import {pool} from "../connections/mysql.js";
import schema, {Coupon} from "../db/schema.js";
import {CartItem} from "../models/cart-models.js";
import container from "../container/index.js";
import {CouponContextType, DiscountType, Money} from "../models/domain.js";
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {Product} from "../models/products.js";
import {CouponConfig, CouponContext, CouponRule} from "../models/coupon.types.js";

const productService = container.resolve('productsService');

export async function isUsed(couponId: any, partyId: number) {

    const connection = await pool.getConnection();

    try {
        const [rows] = await connection.query(
            `
SELECT 
    SUM(Total) as Total
FROM
    (SELECT 
        COUNT(DISTINCT o.Id) Total
    FROM
        SaleOrderItem oi
    JOIN SaleOrder o ON o.Id = oi.OrderId
    WHERE
        CouponId = ? AND o.OrderedBy = ?
            AND o.State IN (2 , 3) 
UNION 
    SELECT 
        COUNT(DISTINCT i.Id) Total
    FROM
        InvoiceItem ii
    JOIN Invoice i ON i.Id = ii.InvoiceId
    WHERE
        ii.CouponId = ? AND i.ReceivedById = ?
        ) AS a
    
    `, [couponId, partyId, couponId, partyId]
        ) as any;

        if (!rows || rows.length === 0)
            return false;

        if (rows && rows.length > 0) {
            return rows[0].Total > 0
        }

        return true;
    } catch (error) {
        console.log(error);
    } finally {
        await connection.release();
    }

}

export function applies(coupon: Coupon, context: any): boolean {
    // we group by CouponContextType (eje: marcas) and then we validate if any shopping contextitem of type exists.
    // Eje: Si existe alguna marca en contexto que cumple con las reglas de las marca Y existe una regla para el PartyTag del cliente
    // basically we use AND logic between different context type (Marca, partyTag) and OR logic withing context brand
    if (!coupon.config)
        return true;

    const config: CouponConfig = JSON.parse(coupon.config)

    var mapRules = new Map<number, []>();

    for (const couponRule of config.Rules) {
        const contextType = couponRule.ContextType;

        if (!mapRules.has(contextType))
            mapRules[contextType] = [];
        mapRules[contextType].push(couponRule);


    }


    /*    foreach (CouponContextType ctxType in mapRules.Keys)
        {
            ret = shoppingCtx.Context
                .Where(sctx => sctx.Type == ctxType)
                .Any(shoppingCtxItem =>
                {
                    return mapRules[ctxType].Any(couponRule => couponRule.Applies(shoppingCtxItem));
                })
            ;
            if (!ret)
                return false;
        }*/

    return true;

}

export function appliesToSaleItem(couponConfig: CouponConfig, itemCtx: CouponContext): boolean {
    var ret = false;
    var a: any[] = [
        CouponContextType.Product,
        CouponContextType.Brand,
        CouponContextType.ProductTag,
        CouponContextType.ProductCategory
    ]


    var map = new Map<number, any>();
    for(var couponRule of couponConfig.Rules)
    {
        if (!a.some(a1 => couponRule.ContextType == a1))
            continue;

        if (!map.has(couponRule.ContextType))
            map[couponRule.ContextType] = [];
        map[couponRule.ContextType].push(couponRule);
    }


    for(const ctxType of map.keys())
    {
        ret = itemCtx.context
            .filter(sctx => sctx.type === ctxType)
            .some(shoppingCtxItem => map[ctxType]
                .some(couponRule => appliesCouponRule(couponRule, shoppingCtxItem)));
        if (!ret)
            return false;
    }

    return true;
}

enum ComparisonType {
    Eq, Lt, Gt, Neq
}
export function appliesCouponRule(couponRule: CouponRule, ctxItem: any): boolean {
    var ret = false;
    if (ctxItem.Type == couponRule.ContextType)
    {
        const comparisonType: ComparisonType = couponRule.ComparisonType
        switch (comparisonType)
        {
            case ComparisonType.Gt:
                ret = ctxItem.Value > Number(couponRule.RuleValue);
                break;
            case ComparisonType.Lt:
                ret = ctxItem.Value < Number(couponRule.RuleValue);
                break;
            default:
                if (couponRule.ContextType == CouponContextType.SaleType && Number(couponRule.RuleValue) == 0)
                {
                    ret = true; // For all Channels.
                }
                else
                {
                    ret = Number(couponRule.RuleValue) == Number(ctxItem.Value);
                }

                break;
        }

        if (ret)
            return true;
    }

    return ret;
}

export async function createCouponContext( item: Partial<CartItem>, domainId: number) : Promise<CouponContext>
{
    if (!item.product)
        return null;

    var ctx: CouponContext = { context: [] };
    const product: Product = await productService.findProductByProductItem(item.product.productItemId, domainId);
    ctx.context.push({ value: product.id, type: CouponContextType.Product } );

    for (var pcategory of product.parentCategories) // A product could belong to many categories
    {
        ctx.context.push({ value: pcategory.id, type: CouponContextType.ProductCategory} );
    }

    ctx.context.push({ value: product.brand.id, type: CouponContextType.Brand });
    return ctx;
}



export function applyDiscount(coupon: Coupon,  salePrice: Money) : Money
{
    if (coupon.discountType == DiscountType.Percent)
    {
        var discount = salePrice.amount * (coupon.discountAmount / 100);

        return new Money (  discount,  salePrice.currency) ;
    }
    return new Money(  coupon.discountAmount,  salePrice.currency);
}