import { IShippingStrategy, ShippingQuote } from "./IShippingStrategy";
export declare class StorePickup implements IShippingStrategy {
    calculate(vw: number, comunaId: number, domainId: number): Promise<ShippingQuote>;
}
