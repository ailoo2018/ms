import { IShippingStrategy, ShippingQuote } from "./IShippingStrategy";
export declare class AlasXpress implements IShippingStrategy {
    calculate(vw: number, comunaId: number, domainId: number): Promise<ShippingQuote>;
}
