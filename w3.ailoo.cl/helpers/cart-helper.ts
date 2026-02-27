import {CouponContextType, SaleType} from "../models/domain.js";
import {v4 as uuidv4} from "uuid";
import container from "../container/index.js";
import {Cart, CartItem, CartItemType} from "../models/cart-models.js";
import {CouponContext} from "../models/coupon.types.js";
import {Coupon} from "../db/schema.js";

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