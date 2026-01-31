import { IShippingStrategy } from "./IShippingStrategy";
export declare class ShippingCostFactory {
    static create(methodId: number, domainId: number): IShippingStrategy;
}
