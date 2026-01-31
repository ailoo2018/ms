import { ShoppingCart } from "../models/cart.types";
import { ShippingService } from "./ShippingService";
export declare const AppliesToEnum: {
    readonly CheapestItem: "CheapestItem";
    readonly TotalApplicableItems: "TotalApplicableItems";
    readonly TotalApplicableItemsOneSale: "TotalApplicableItemsOneSale";
};
interface Discount {
    type: "%" | "$";
    amount: number;
}
interface ProductRuleDto {
    quantity: number;
    currentCount?: number;
    categories?: {
        id: number;
    }[];
    brands?: {
        id: number;
    }[];
    tags?: {
        id: number;
    }[];
    products?: {
        id: number;
    }[];
    minPrice?: number;
}
interface DiscountRule {
    id: number | string;
    name: string;
    appliesTo: string;
    discount: Discount;
    rules: ProductRuleDto[];
}
export declare class CartService {
    private discountRuleService;
    private _productCategoryService;
    private _cartRepository;
    private shippingService;
    constructor({ productCategoryService, discountRuleService, cartRepository, shippingService }: {
        productCategoryService: any;
        discountRuleService: any;
        cartRepository: any;
        shippingService: ShippingService;
    });
    applies(productRuleDto: ProductRuleDto, item: any, domainId: number, discountRule: DiscountRule): Promise<{
        applies: boolean;
        qty: number;
    }>;
    getDiscounts(rq: any, discountRule: DiscountRule, domainId: number): Promise<any[]>;
    analyze(saleContext: any, discountRuleId: string | number, domainId: number): Promise<never[] | {
        discounts: any[];
        rule: any;
    }>;
    volumetricWeight(cart: ShoppingCart, domainId: number): Promise<number>;
    save(cart: ShoppingCart): Promise<void>;
    update(cart: ShoppingCart): Promise<void>;
    listShippingQuotes(cart: ShoppingCart, comunaId: number, domainId: number): Promise<{
        destination: {
            comunaId: number;
        };
        methods: any[];
    }>;
    private calculatePreparationTime;
}
export {};
