import { Money } from "../../models/universal.types";
export interface ShippingQuote {
    cost: Money;
    estimatedDays: number;
    carrierName: string;
    isPickup: boolean;
}
export interface IShippingStrategy {
    calculate(vw: number, comunaId: number, domainId: number): Promise<ShippingQuote>;
}
