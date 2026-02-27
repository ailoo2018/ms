import {CouponContextType, DiscountType, Money, SaleType} from "../models/domain.js";
import {v4 as uuidv4} from "uuid";
import container from "../container/index.js";
import {Cart, CartCoupon, CartItem, CartItemType} from "../models/cart-models.js";
import {CouponConfig, CouponContext} from "../models/coupon.types.js";
import {Coupon} from "../db/schema.js";
import {db as drizzleDb} from "../db/drizzle.js";
import * as couponHelper from "./coupon-helper.js";
import * as cartHelper from "../helpers/cart-helper.js"
import {CouponConfig} from "../models/coupon.types.js";

const productService = container.resolve('productsService');



export function subtotal(cart: Partial<Cart>){
    return 0
}

export async function createCouponContext(cart: Partial<Cart>, domainId: number) : Promise<CouponContext> {
    var couponCtx: CouponContext = {
        context: []
    };
    couponCtx.context.push({ value: subtotal(cart), type:  CouponContextType.SubTotal, typeName: "SubTotal" });
    couponCtx.context.push({ value: SaleType.Internet, type: CouponContextType.SaleType, typeName: "SaleType" });
    for (var cartItem of cart.items)
    {
        if (cartItem.product != null)
        {
            var product = await productService.findProductByProductItem(cartItem.product.productItemId, domainId);
            couponCtx.context.push({ value: product, name: product.name,  type: CouponContextType.Product, typeName: "Product" });

            for (var pcategory of product.parentCategories) // A product could belong to many categories
            {
                couponCtx.context.push({ value: pcategory.id, name: pcategory.name, type:  CouponContextType.ProductCategory, typeName: 'ProductCategory' } );
            }

            couponCtx.context.push({ value: product.brand.id, name: product.brand.name, type: CouponContextType.Brand, typeName: "Brand" });

            for (var productTag of product.tags)
            {
                couponCtx.context.push({ value: productTag.id, name: productTag.name, type: CouponContextType.ProductTag, typeName: "ProductTag" });
            }
        }

    }

    return couponCtx;
}

export function addCoupon(cart: Partial<Cart>, description: string, total: number, coupon: Coupon) {
    const item : Partial<CartItem> = {
        name: description,
        description: description,
        price: total,
        quantity: 1,
        type: CartItemType.Coupon,
        id: uuidv4(),
        coupon: {
            id: coupon.id,
            name: coupon.name,
            description: coupon.description,
            validFrom:  coupon.validFrom,
            validUntil: coupon.validUntil
        }
    }

    cart.items.push(item as CartItem)

}


export async function applyCoupon(code: string, cart: Partial<Cart>, domainId: number) : Promise<CartCoupon>  {
    let user = null;
    if (cart.userId > 0) {
        user = await drizzleDb.query.user.findFirst({
            where: (user, {eq, and}) => and(eq(user.id, cart.userId), eq(user.domainId, domainId)),
            with: {
                person: {
                    with: {
                        partyTags: {
                            with: {
                                tag: true
                            }
                        }
                    }
                },

            }
        })
    }


    const coupon : Coupon = await drizzleDb.query.coupon.findFirst({
        where: (coupon, {eq, like, and}) => {
            return and(
                like(coupon.name, code),
                eq(coupon.domainId, domainId),
                eq(coupon.deleted, 0)
            )
        }
    })

    if (!coupon) {
        throw new Error(`Cupón '${code} no encontrado'`)
    }

    const today = new Date(new Date().toISOString().split('T')[0]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (coupon.validUntil != null && !(coupon.validUntil >= today) ) {
        throw new Error(`El cupon expiro el ${coupon.validUntil} ${tomorrow}`)
    }


    if (coupon.isMultiUse > 0 && user != null && user.person != null && couponHelper.isUsed(coupon, user.person.id))
        throw new Error( "Cupón ya fue utilizado");


    const couponConfig : CouponConfig = JSON.parse(coupon.config);
    const context = await cartHelper.createCouponContext(cart, domainId)

    if (user && user.person && user.person.partyTags != null) {
        for (var ptag of user.person.partyTags)
            context.context.push({
                name: ptag.tag?.description || null,
                value: ptag.tag?.id,
                type: CouponContextType.PartyTag,
                typeName: "PartyTag"
            });
    }

    if (!couponHelper.applies(coupon, context)) {
        throw new Error("Cupón no aplica a su compra actual.")

    }

    var totalDiscount = new Money( 0,  cart.currency );
    if (coupon.discountType == DiscountType.Percent)
        for (var si of cart.items.filter(i1 => i1.product?.productItemId)) {
            var itemCtx = await couponHelper.createCouponContext(si, domainId);

            if (itemCtx != null && couponHelper.appliesToSaleItem(couponConfig, itemCtx))
                totalDiscount.amount = couponHelper
                    .applyDiscount(coupon, new Money(si.price * si.quantity, cart.currency))
                    .amount;
        }
    else
        totalDiscount = {amount: coupon.discountAmount, currency: "CLP"};

    var coupons = cart.items.filter(i => i.coupon != null).map(c => c.id);

    // remove existing coupon with same id
    cart.coupons = cart.coupons.filter(ci => !coupons.some(ci2 => ci2 == ci.id));



    return  {
        id: coupon.id,
        name: coupon.name,
        discount: totalDiscount.amount,
        description: coupon.description,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
    };

}